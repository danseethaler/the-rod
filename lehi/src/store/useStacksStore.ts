import {create} from 'zustand';

import {newId} from '@/lib/ids';
import {
  computeImportPreview,
  computeReplacePreview,
  markdownToStack,
  type ImportPreview,
} from '@/lib/markdown';
import {
  allVerses,
  buildVerseSetReference,
  buildVerseSetUrl,
  chapterTitleFromReference,
  getCanonicalVerseText,
  verseRefsFrom,
} from '@/lib/scripture';
import {loadJson, saveJson, STORAGE_KEYS} from '@/lib/storage';
import type {
  Section,
  Stack,
  StackItem,
  StackItemNote,
  StackItemVerse,
  StackStatus,
  Verse,
} from '@/lib/types';

let CORPUS_INDEX: Map<string, Verse> | null = null;
function corpusIndex(): Map<string, Verse> {
  if (CORPUS_INDEX) return CORPUS_INDEX;
  CORPUS_INDEX = new Map();
  for (const v of allVerses()) CORPUS_INDEX.set(v.reference, v);
  return CORPUS_INDEX;
}

function matchByReferenceAndVerse(
  reference: string,
  verseNumber: number | undefined
): Verse | undefined {
  if (verseNumber == null) return undefined;
  const chapterTitle = chapterTitleFromReference(reference);
  return corpusIndex().get(`${chapterTitle}:${verseNumber}`);
}

function extractChapterFromReference(reference: string): number {
  const chapterTitle = chapterTitleFromReference(reference);
  const m = /(\d+)\s*$/.exec(chapterTitle);
  return m ? parseInt(m[1], 10) : 1;
}

/**
 * App-level preferences persisted under `STORAGE_KEYS.prefs`. Keep this
 * shape additive — old keys are ignored on hydrate, missing ones fall
 * back to defaults.
 */
export interface AppPrefs {
  /**
   * Route name of the tab the user was last on. The tabs layout reads
   * this once at mount to pick its initial route, and updates it on
   * every focus event.
   */
  lastTab: 'index' | 'stacks' | 'settings';
}

const DEFAULT_PREFS: AppPrefs = {lastTab: 'index'};

interface StacksState {
  hydrated: boolean;
  stacks: Stack[];
  sections: Section[];
  items: StackItem[];
  prefs: AppPrefs;

  // Transient — verses queued by the search flow that are about to be
  // dropped into a stack via the picker. Not persisted.
  pendingVerses: Verse[];

  // Transient — parsed markdown awaiting confirmation in the import-preview
  // sheet. Cleared on confirm, cancel, or screen unmount. Not persisted.
  pendingImport: ImportPreview | null;

  hydrate: () => Promise<void>;
  setLastTab: (tab: AppPrefs['lastTab']) => void;

  // Stacks
  createStack: (title: string) => Stack;
  renameStack: (id: string, title: string) => void;
  setStackStatus: (id: string, status: StackStatus) => void;
  deleteStack: (id: string) => void;
  reorderSections: (stackId: string, newOrder: string[]) => void;

  // Sections
  createSection: (stackId: string, title?: string) => Section;
  renameSection: (sectionId: string, title: string) => void;
  setSectionBody: (sectionId: string, body: string) => void;
  deleteSection: (sectionId: string) => void;
  reorderItemsInSection: (sectionId: string, newOrder: string[]) => void;
  moveItem: (
    itemId: string,
    fromSectionId: string,
    toSectionId: string,
    toIndex?: number
  ) => void;

  // Items — convenience wrappers route to the stack's first section.
  // Section-targeted versions take an explicit sectionId.
  addVerseSetToStack: (stackId: string, verses: Verse[]) => StackItemVerse;
  addVerseSetToSection: (sectionId: string, verses: Verse[]) => StackItemVerse;
  addNoteToStack: (stackId: string, body: string) => StackItemNote;
  addNoteToSection: (sectionId: string, body: string) => StackItemNote;
  updateNoteBody: (itemId: string, body: string) => void;
  updateVerseThought: (itemId: string, thought: string) => void;
  updateHeadline: (itemId: string, headline: string) => void;
  updateVerseText: (itemId: string, verseNumber: number, text: string) => void;
  resetVerseText: (itemId: string, verseNumber: number) => void;
  removeItem: (itemId: string) => void;

  // Pending-verse handoff
  setPendingVerses: (verses: Verse[]) => void;
  clearPendingVerses: () => void;

  // Import / round-trip
  previewImport: (md: string) => ImportPreview;
  previewReplace: (md: string, targetStackId: string) => ImportPreview;
  setPendingImport: (preview: ImportPreview | null) => void;
  applyImportPreview: (preview: ImportPreview) => ImportResult;
}

export interface ImportResult {
  stackId: string;
  action: 'created' | 'updated' | 'replaced';
  itemCount: number;
  sectionCount: number;
}

type PersistShape = Pick<StacksState, 'stacks' | 'sections' | 'items'>;

const persist = (state: PersistShape) => {
  saveJson(STORAGE_KEYS.stacks, state.stacks).catch(() => {});
  saveJson(STORAGE_KEYS.sections, state.sections).catch(() => {});
  saveJson(STORAGE_KEYS.stackItems, state.items).catch(() => {});
};

export const useStacksStore = create<StacksState>((set, get) => ({
  hydrated: false,
  stacks: [],
  sections: [],
  items: [],
  prefs: DEFAULT_PREFS,
  pendingVerses: [],
  pendingImport: null,

  hydrate: async () => {
    const [rawStacks, sections, items, prefs] = await Promise.all([
      loadJson<Stack[]>(STORAGE_KEYS.stacks, []),
      loadJson<Section[]>(STORAGE_KEYS.sections, []),
      loadJson<StackItem[]>(STORAGE_KEYS.stackItems, []),
      loadJson<AppPrefs>(STORAGE_KEYS.prefs, DEFAULT_PREFS),
    ]);
    // Defensive coercion — any persisted stack without `sectionIds` (e.g.
    // a stack written by an in-flight pre-section build) loads with an
    // empty array so `.reduce` / `.map` calls downstream don't crash.
    const stacks = rawStacks.map(s => ({
      ...s,
      sectionIds: Array.isArray(s.sectionIds) ? s.sectionIds : [],
    }));
    // Merge against defaults so a stale persisted shape with missing
    // keys still produces a complete prefs object.
    const mergedPrefs: AppPrefs = {...DEFAULT_PREFS, ...prefs};
    set({stacks, sections, items, prefs: mergedPrefs, hydrated: true});
  },

  setLastTab: tab => {
    const prefs = {...get().prefs, lastTab: tab};
    set({prefs});
    saveJson(STORAGE_KEYS.prefs, prefs).catch(() => {});
  },

  createStack: title => {
    const now = Date.now();
    const stackId = newId();
    const defaultSection: Section = {
      id: newId(),
      stackId,
      title: '',
      body: '',
      itemIds: [],
      createdAt: now,
    };
    const stack: Stack = {
      id: stackId,
      title: title.trim() || 'Untitled stack',
      status: 'baking',
      sectionIds: [defaultSection.id],
      createdAt: now,
      updatedAt: now,
    };
    const stacks = [stack, ...get().stacks];
    const sections = [...get().sections, defaultSection];
    set({stacks, sections});
    persist({stacks, sections, items: get().items});
    return stack;
  },

  renameStack: (id, title) => {
    const stacks = get().stacks.map(s =>
      s.id === id
        ? {...s, title: title.trim() || s.title, updatedAt: Date.now()}
        : s
    );
    set({stacks});
    persist({stacks, sections: get().sections, items: get().items});
  },

  setStackStatus: (id, status) => {
    const stacks = get().stacks.map(s =>
      s.id === id ? {...s, status, updatedAt: Date.now()} : s
    );
    set({stacks});
    persist({stacks, sections: get().sections, items: get().items});
  },

  deleteStack: id => {
    const stack = get().stacks.find(s => s.id === id);
    if (!stack) return;
    const stacks = get().stacks.filter(s => s.id !== id);
    const sections = get().sections.filter(s => s.stackId !== id);
    const items = get().items.filter(i => i.stackId !== id);
    set({stacks, sections, items});
    persist({stacks, sections, items});
  },

  reorderSections: (stackId, newOrder) => {
    const stacks = get().stacks.map(s =>
      s.id === stackId ? {...s, sectionIds: newOrder, updatedAt: Date.now()} : s
    );
    set({stacks});
    persist({stacks, sections: get().sections, items: get().items});
  },

  createSection: (stackId, title = '') => {
    const now = Date.now();
    const section: Section = {
      id: newId(),
      stackId,
      title,
      body: '',
      itemIds: [],
      createdAt: now,
    };
    const sections = [...get().sections, section];
    const stacks = get().stacks.map(s =>
      s.id === stackId
        ? {...s, sectionIds: [...s.sectionIds, section.id], updatedAt: now}
        : s
    );
    set({stacks, sections});
    persist({stacks, sections, items: get().items});
    return section;
  },

  renameSection: (sectionId, title) => {
    const sections = get().sections.map(s =>
      s.id === sectionId ? {...s, title} : s
    );
    set({sections});
    bumpStackUpdatedAt(sectionId, get, set, persist);
  },

  setSectionBody: (sectionId, body) => {
    const sections = get().sections.map(s =>
      s.id === sectionId ? {...s, body} : s
    );
    set({sections});
    bumpStackUpdatedAt(sectionId, get, set, persist);
  },

  deleteSection: sectionId => {
    const section = get().sections.find(s => s.id === sectionId);
    if (!section) return;
    const stack = get().stacks.find(s => s.id === section.stackId);
    if (!stack) return;
    // A stack must always have at least one section; if this is the last
    // one, refuse the delete silently.
    if (stack.sectionIds.length <= 1) return;
    const sections = get().sections.filter(s => s.id !== sectionId);
    const items = get().items.filter(i => !section.itemIds.includes(i.id));
    const stacks = get().stacks.map(s =>
      s.id === stack.id
        ? {
            ...s,
            sectionIds: s.sectionIds.filter(id => id !== sectionId),
            updatedAt: Date.now(),
          }
        : s
    );
    set({stacks, sections, items});
    persist({stacks, sections, items});
  },

  reorderItemsInSection: (sectionId, newOrder) => {
    const sections = get().sections.map(s =>
      s.id === sectionId ? {...s, itemIds: newOrder} : s
    );
    set({sections});
    bumpStackUpdatedAt(sectionId, get, set, persist);
  },

  moveItem: (itemId, fromSectionId, toSectionId, toIndex) => {
    if (fromSectionId === toSectionId) return;
    const sections = get().sections.map(s => {
      if (s.id === fromSectionId) {
        return {...s, itemIds: s.itemIds.filter(id => id !== itemId)};
      }
      if (s.id === toSectionId) {
        const next = [...s.itemIds];
        const insertAt = toIndex == null ? next.length : toIndex;
        next.splice(insertAt, 0, itemId);
        return {...s, itemIds: next};
      }
      return s;
    });
    set({sections});
    bumpStackUpdatedAt(toSectionId, get, set, persist);
  },

  addVerseSetToStack: (stackId, verses) => {
    const sectionId = firstSectionId(get(), stackId);
    return get().addVerseSetToSection(sectionId, verses);
  },

  addVerseSetToSection: (sectionId, verses) => {
    const section = get().sections.find(s => s.id === sectionId);
    if (!section) {
      throw new Error(`addVerseSetToSection: section ${sectionId} not found`);
    }
    const item = buildVerseSetItem(section.stackId, verses);
    const items = [...get().items, item];
    const sections = get().sections.map(s =>
      s.id === sectionId ? {...s, itemIds: [...s.itemIds, item.id]} : s
    );
    const stacks = touchStackUpdatedAt(get().stacks, section.stackId);
    set({stacks, sections, items});
    persist({stacks, sections, items});
    return item;
  },

  addNoteToStack: (stackId, body) => {
    const sectionId = firstSectionId(get(), stackId);
    return get().addNoteToSection(sectionId, body);
  },

  addNoteToSection: (sectionId, body) => {
    const section = get().sections.find(s => s.id === sectionId);
    if (!section) {
      throw new Error(`addNoteToSection: section ${sectionId} not found`);
    }
    const trimmed = body.trim();
    const headline =
      trimmed
        .split('\n')
        .find(l => l.trim().length > 0)
        ?.trim() || 'Note';
    const item: StackItemNote = {
      id: newId(),
      stackId: section.stackId,
      kind: 'note',
      headline,
      body: trimmed,
      createdAt: Date.now(),
    };
    const items = [...get().items, item];
    const sections = get().sections.map(s =>
      s.id === sectionId ? {...s, itemIds: [...s.itemIds, item.id]} : s
    );
    const stacks = touchStackUpdatedAt(get().stacks, section.stackId);
    set({stacks, sections, items});
    persist({stacks, sections, items});
    return item;
  },

  updateNoteBody: (itemId, body) => {
    const items = get().items.map(i =>
      i.id === itemId && i.kind === 'note' ? {...i, body} : i
    );
    set({items});
    persist({stacks: get().stacks, sections: get().sections, items});
  },

  updateVerseThought: (itemId, thought) => {
    const items = get().items.map(i =>
      i.id === itemId && i.kind === 'verse' ? {...i, thought} : i
    );
    set({items});
    persist({stacks: get().stacks, sections: get().sections, items});
  },

  updateHeadline: (itemId, headline) => {
    const items = get().items.map(i =>
      i.id === itemId ? {...i, headline} : i
    );
    set({items});
    persist({stacks: get().stacks, sections: get().sections, items});
  },

  updateVerseText: (itemId, verseNumber, text) => {
    const items = get().items.map(i => {
      if (i.id !== itemId || i.kind !== 'verse') return i;
      return {
        ...i,
        verses: i.verses.map(v => (v.verse === verseNumber ? {...v, text} : v)),
      };
    });
    set({items});
    persist({stacks: get().stacks, sections: get().sections, items});
  },

  resetVerseText: (itemId, verseNumber) => {
    const item = get().items.find(i => i.id === itemId);
    if (!item || item.kind !== 'verse') return;
    const canonical = getCanonicalVerseText(
      item.standardWorkSlug,
      item.bookSlug,
      item.chapter,
      verseNumber
    );
    if (canonical == null) return;
    const items = get().items.map(i => {
      if (i.id !== itemId || i.kind !== 'verse') return i;
      return {
        ...i,
        verses: i.verses.map(v =>
          v.verse === verseNumber ? {...v, text: canonical} : v
        ),
      };
    });
    set({items});
    persist({stacks: get().stacks, sections: get().sections, items});
  },

  removeItem: itemId => {
    const item = get().items.find(i => i.id === itemId);
    if (!item) return;
    const items = get().items.filter(i => i.id !== itemId);
    const sections = get().sections.map(s =>
      s.itemIds.includes(itemId)
        ? {...s, itemIds: s.itemIds.filter(id => id !== itemId)}
        : s
    );
    const stacks = touchStackUpdatedAt(get().stacks, item.stackId);
    set({stacks, sections, items});
    persist({stacks, sections, items});
  },

  setPendingVerses: verses => {
    set({pendingVerses: verses});
  },

  clearPendingVerses: () => {
    set({pendingVerses: []});
  },

  previewImport: md => {
    const parsed = markdownToStack(md);
    return computeImportPreview(parsed, {
      stacks: get().stacks,
      sections: get().sections,
      items: get().items,
      generateId: newId,
    });
  },

  previewReplace: (md, targetStackId) => {
    const parsed = markdownToStack(md);
    const target = get().stacks.find(s => s.id === targetStackId);
    if (!target) {
      throw new Error(`previewReplace: stack ${targetStackId} not found`);
    }
    return computeReplacePreview(parsed, target, {
      stacks: get().stacks,
      sections: get().sections,
      items: get().items,
      generateId: newId,
    });
  },

  setPendingImport: preview => {
    set({pendingImport: preview});
  },

  applyImportPreview: preview => {
    return applyImport(preview, get, set);
  },
}));

function firstSectionId(state: StacksState, stackId: string): string {
  const stack = state.stacks.find(s => s.id === stackId);
  if (!stack || stack.sectionIds.length === 0) {
    throw new Error(
      `firstSectionId: stack ${stackId} has no sections — every stack should have at least one`
    );
  }
  return stack.sectionIds[0];
}

function touchStackUpdatedAt(stacks: Stack[], stackId: string): Stack[] {
  return stacks.map(s =>
    s.id === stackId ? {...s, updatedAt: Date.now()} : s
  );
}

function bumpStackUpdatedAt(
  sectionId: string,
  get: () => StacksState,
  set: (partial: Partial<StacksState>) => void,
  persistFn: (state: PersistShape) => void
): void {
  const section = get().sections.find(s => s.id === sectionId);
  if (!section) {
    persistFn({
      stacks: get().stacks,
      sections: get().sections,
      items: get().items,
    });
    return;
  }
  const stacks = touchStackUpdatedAt(get().stacks, section.stackId);
  set({stacks});
  persistFn({stacks, sections: get().sections, items: get().items});
}

function applyImport(
  preview: ImportPreview,
  get: () => StacksState,
  set: (partial: Partial<StacksState>) => void
): ImportResult {
  const now = Date.now();
  const existingStack = get().stacks.find(s => s.id === preview.targetStackId);

  // Build new sections + items from the parsed payload. Authoritative
  // replacement — the imported markdown wins.
  const builtSections: Section[] = [];
  const builtItems: StackItem[] = [];

  for (const ps of preview.parsed.sections) {
    const section: Section = {
      id: newId(),
      stackId: preview.targetStackId,
      title: ps.title,
      body: ps.body,
      itemIds: [],
      createdAt: now,
    };
    for (const p of ps.items) {
      const itemId = newId();
      section.itemIds.push(itemId);
      if (p.kind === 'verse') {
        const found = matchByReferenceAndVerse(p.reference, p.verses[0]?.verse);
        const item: StackItemVerse = {
          id: itemId,
          stackId: preview.targetStackId,
          kind: 'verse',
          headline: p.headline,
          reference: p.reference,
          url: p.url,
          standardWorkSlug: found?.standardWorkSlug ?? 'unknown',
          bookSlug: found?.bookSlug,
          chapter: found?.chapter ?? extractChapterFromReference(p.reference),
          verses: [...p.verses].sort((a, b) => a.verse - b.verse),
          thought: p.thought,
          createdAt: now,
        };
        builtItems.push(item);
      } else {
        const item: StackItemNote = {
          id: itemId,
          stackId: preview.targetStackId,
          kind: 'note',
          headline: p.headline,
          body: p.body,
          createdAt: now,
        };
        builtItems.push(item);
      }
    }
    // A stack always has at least one section; if the parsed payload had
    // none, we still want one default. Builder iterates parsed.sections, so
    // an empty parsed yields zero — handled below.
    builtSections.push(section);
  }

  if (builtSections.length === 0) {
    builtSections.push({
      id: newId(),
      stackId: preview.targetStackId,
      title: '',
      body: '',
      itemIds: [],
      createdAt: now,
    });
  }

  // Drop any prior data scoped to this stack — sections + items wholesale.
  const otherSections = get().sections.filter(
    s => s.stackId !== preview.targetStackId
  );
  const otherItems = get().items.filter(
    i => i.stackId !== preview.targetStackId
  );
  const sections = [...otherSections, ...builtSections];
  const items = [...otherItems, ...builtItems];

  let stacks: Stack[];
  let action: 'created' | 'updated' | 'replaced';

  if (existingStack) {
    stacks = get().stacks.map(s =>
      s.id === existingStack.id
        ? {
            ...s,
            title: preview.title,
            sectionIds: builtSections.map(sec => sec.id),
            updatedAt: now,
          }
        : s
    );
    action = preview.action === 'replace' ? 'replaced' : 'updated';
  } else {
    const newStack: Stack = {
      id: preview.targetStackId,
      title: preview.title,
      status: 'baking',
      sectionIds: builtSections.map(sec => sec.id),
      createdAt: now,
      updatedAt: now,
    };
    stacks = [newStack, ...get().stacks];
    action = 'created';
  }

  set({stacks, sections, items});
  persist({stacks, sections, items});

  return {
    stackId: preview.targetStackId,
    action,
    itemCount: builtItems.length,
    sectionCount: builtSections.length,
  };
}

function buildVerseSetItem(stackId: string, verses: Verse[]): StackItemVerse {
  if (verses.length === 0) {
    throw new Error('addVerseSetToStack: empty verses array');
  }
  const sorted = [...verses].sort((a, b) => a.verse - b.verse);
  const first = sorted[0];
  for (const v of sorted) {
    if (
      v.standardWorkSlug !== first.standardWorkSlug ||
      (v.bookSlug ?? '') !== (first.bookSlug ?? '') ||
      v.chapter !== first.chapter
    ) {
      throw new Error(
        'addVerseSetToStack: all verses must share book + chapter'
      );
    }
  }
  const chapterTitle = chapterTitleFromReference(first.reference);
  const reference = buildVerseSetReference(
    chapterTitle,
    sorted.map(v => v.verse)
  );
  return {
    id: newId(),
    stackId,
    kind: 'verse',
    headline: reference,
    reference,
    url: buildVerseSetUrl(sorted),
    standardWorkSlug: first.standardWorkSlug,
    bookSlug: first.bookSlug,
    chapter: first.chapter,
    verses: verseRefsFrom(sorted),
    thought: '',
    createdAt: Date.now(),
  };
}

// Selectors
export const selectStackById =
  (id: string) =>
  (s: StacksState): Stack | undefined =>
    s.stacks.find(stack => stack.id === id);

/**
 * Resolve a stack's sections, in order. Pure helper — call from a
 * `useMemo` in the component for stable refs.
 */
export function resolveStackSections(
  stack: Stack | undefined,
  allSections: Section[]
): Section[] {
  if (!stack) return [];
  return stack.sectionIds
    .map(id => allSections.find(s => s.id === id))
    .filter((s): s is Section => s != null);
}

/**
 * Resolve a single section's items, in order. Pure helper — call from a
 * `useMemo` for stable refs.
 */
export function resolveSectionItems(
  section: Section | undefined,
  allItems: StackItem[]
): StackItem[] {
  if (!section) return [];
  return section.itemIds
    .map(id => allItems.find(i => i.id === id))
    .filter((i): i is StackItem => i != null);
}
