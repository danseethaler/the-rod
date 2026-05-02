import {create} from 'zustand';

import {newId} from '@/lib/ids';
import {
  computeImportPreview,
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

/**
 * Given a multi-verse reference ("1 Nephi 3:7-9") and a known verse
 * number, find the matching corpus entry so we can recover chapter / book
 * / work metadata.
 */
function matchByReferenceAndVerse(
  reference: string,
  verseNumber: number | undefined
): Verse | undefined {
  if (verseNumber == null) return undefined;
  const chapterTitle = chapterTitleFromReference(reference);
  return corpusIndex().get(`${chapterTitle}:${verseNumber}`);
}

/** Pull the chapter number out of a reference's chapter prefix — `"1 Nephi 3:7-9"` → 3. */
function extractChapterFromReference(reference: string): number {
  const chapterTitle = chapterTitleFromReference(reference);
  const m = /(\d+)\s*$/.exec(chapterTitle);
  return m ? parseInt(m[1], 10) : 1;
}

interface StacksState {
  hydrated: boolean;
  stacks: Stack[];
  items: StackItem[];

  // Transient — verses queued by the search flow that are about to be
  // dropped into a stack via the picker. Not persisted.
  pendingVerses: Verse[];

  // Transient — parsed markdown awaiting confirmation in the import-preview
  // sheet. Cleared on confirm, cancel, or screen unmount. Not persisted.
  pendingImport: ImportPreview | null;

  hydrate: () => Promise<void>;

  // Stacks
  createStack: (title: string) => Stack;
  renameStack: (id: string, title: string) => void;
  setStackStatus: (id: string, status: StackStatus) => void;
  deleteStack: (id: string) => void;
  reorderItems: (stackId: string, newOrder: string[]) => void;

  // Items
  /**
   * Add one or more verses to a stack as a single grouped item. All verses
   * must share standardWorkSlug + bookSlug + chapter; the caller enforces
   * this (the verse-context view is per-chapter, and the search list adds
   * a single verse at a time).
   */
  addVerseSetToStack: (stackId: string, verses: Verse[]) => StackItemVerse;
  addNoteToStack: (stackId: string, body: string) => StackItemNote;
  updateNoteBody: (itemId: string, body: string) => void;
  updateVerseThought: (itemId: string, thought: string) => void;
  updateHeadline: (itemId: string, headline: string) => void;
  /**
   * Replace the markdown text for a single verse inside a verse-set
   * item. Caller is responsible for the markdown shape (the inline
   * formatting & trim helpers in `lib/verseFormat.ts` produce the right
   * thing).
   */
  updateVerseText: (itemId: string, verseNumber: number, text: string) => void;
  /**
   * Restore one verse inside a verse-set to its canonical scripture
   * text from the bundled corpus. No-op if the item or verse can't be
   * found, or if no canonical text resolves (e.g. legacy migrated item
   * with `standardWorkSlug === 'unknown'`).
   */
  resetVerseText: (itemId: string, verseNumber: number) => void;
  removeItem: (itemId: string) => void;

  // Pending-verse handoff
  setPendingVerses: (verses: Verse[]) => void;
  clearPendingVerses: () => void;

  // Import / round-trip
  previewImport: (md: string) => ImportPreview;
  setPendingImport: (preview: ImportPreview | null) => void;
  applyImportPreview: (preview: ImportPreview) => ImportResult;
}

export interface ImportResult {
  stackId: string;
  action: 'created' | 'updated';
  itemCount: number;
}

const persist = (state: Pick<StacksState, 'stacks' | 'items'>) => {
  saveJson(STORAGE_KEYS.stacks, state.stacks).catch(() => {});
  saveJson(STORAGE_KEYS.stackItems, state.items).catch(() => {});
};

export const useStacksStore = create<StacksState>((set, get) => ({
  hydrated: false,
  stacks: [],
  items: [],
  pendingVerses: [],
  pendingImport: null,

  hydrate: async () => {
    const [stacks, rawItems] = await Promise.all([
      loadJson<Stack[]>(STORAGE_KEYS.stacks, []),
      loadJson<StackItem[]>(STORAGE_KEYS.stackItems, []),
    ]);
    const {items, migrated} = migrateItems(rawItems);
    set({stacks, items, hydrated: true});
    // If we rewrote any verse items into the new grouped shape, persist
    // the migrated payload so we don't pay the migration cost on every
    // launch (and so a future export uses the canonical fields).
    if (migrated) {
      persist({stacks, items});
    }
  },

  createStack: title => {
    const now = Date.now();
    const stack: Stack = {
      id: newId(),
      title: title.trim() || 'Untitled stack',
      status: 'baking',
      itemIds: [],
      createdAt: now,
      updatedAt: now,
    };
    const next = {...get(), stacks: [stack, ...get().stacks]};
    set({stacks: next.stacks});
    persist({stacks: next.stacks, items: get().items});
    return stack;
  },

  renameStack: (id, title) => {
    const stacks = get().stacks.map(s =>
      s.id === id
        ? {...s, title: title.trim() || s.title, updatedAt: Date.now()}
        : s
    );
    set({stacks});
    persist({stacks, items: get().items});
  },

  setStackStatus: (id, status) => {
    const stacks = get().stacks.map(s =>
      s.id === id ? {...s, status, updatedAt: Date.now()} : s
    );
    set({stacks});
    persist({stacks, items: get().items});
  },

  deleteStack: id => {
    const stacks = get().stacks.filter(s => s.id !== id);
    const items = get().items.filter(i => i.stackId !== id);
    set({stacks, items});
    persist({stacks, items});
  },

  reorderItems: (stackId, newOrder) => {
    const stacks = get().stacks.map(s =>
      s.id === stackId ? {...s, itemIds: newOrder, updatedAt: Date.now()} : s
    );
    set({stacks});
    persist({stacks, items: get().items});
  },

  addVerseSetToStack: (stackId, verses) => {
    const item = buildVerseSetItem(stackId, verses);
    const items = [...get().items, item];
    const stacks = get().stacks.map(s =>
      s.id === stackId
        ? {...s, itemIds: [...s.itemIds, item.id], updatedAt: Date.now()}
        : s
    );
    set({items, stacks});
    persist({stacks, items});
    return item;
  },

  addNoteToStack: (stackId, body) => {
    const trimmed = body.trim();
    const headline =
      trimmed
        .split('\n')
        .find(l => l.trim().length > 0)
        ?.trim() || 'Note';
    const item: StackItemNote = {
      id: newId(),
      stackId,
      kind: 'note',
      headline,
      body: trimmed,
      createdAt: Date.now(),
    };
    const items = [...get().items, item];
    const stacks = get().stacks.map(s =>
      s.id === stackId
        ? {...s, itemIds: [...s.itemIds, item.id], updatedAt: Date.now()}
        : s
    );
    set({items, stacks});
    persist({stacks, items});
    return item;
  },

  updateNoteBody: (itemId, body) => {
    const items = get().items.map(i =>
      i.id === itemId && i.kind === 'note' ? {...i, body} : i
    );
    set({items});
    persist({stacks: get().stacks, items});
  },

  updateVerseThought: (itemId, thought) => {
    const items = get().items.map(i =>
      i.id === itemId && i.kind === 'verse' ? {...i, thought} : i
    );
    set({items});
    persist({stacks: get().stacks, items});
  },

  updateHeadline: (itemId, headline) => {
    const items = get().items.map(i =>
      i.id === itemId ? {...i, headline} : i
    );
    set({items});
    persist({stacks: get().stacks, items});
  },

  updateVerseText: (itemId, verseNumber, text) => {
    const items = get().items.map(i => {
      if (i.id !== itemId || i.kind !== 'verse') return i;
      return {
        ...i,
        verses: i.verses.map(v =>
          v.verse === verseNumber ? {...v, text} : v
        ),
      };
    });
    set({items});
    persist({stacks: get().stacks, items});
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
    persist({stacks: get().stacks, items});
  },

  removeItem: itemId => {
    const item = get().items.find(i => i.id === itemId);
    if (!item) return;
    const items = get().items.filter(i => i.id !== itemId);
    const stacks = get().stacks.map(s =>
      s.id === item.stackId
        ? {
            ...s,
            itemIds: s.itemIds.filter(id => id !== itemId),
            updatedAt: Date.now(),
          }
        : s
    );
    set({items, stacks});
    persist({stacks, items});
  },

  setPendingVerses: verses => {
    set({pendingVerses: verses});
  },

  clearPendingVerses: () => {
    set({pendingVerses: []});
  },

  previewImport: md => {
    const parsed = markdownToStack(md);
    return computeImportPreview(parsed, get().stacks, get().items, newId);
  },

  setPendingImport: preview => {
    set({pendingImport: preview});
  },

  applyImportPreview: preview => {
    return applyImport(preview, get, set);
  },
}));

function applyImport(
  preview: ImportPreview,
  get: () => StacksState,
  set: (partial: Partial<StacksState>) => void
): ImportResult {
  const now = Date.now();
  const existingStack = get().stacks.find(s => s.id === preview.targetStackId);
  const existingItems = existingStack
    ? get().items.filter(i => i.stackId === existingStack.id)
    : [];

  const newItems: StackItem[] = preview.parsed.items.map(p => {
    // Reuse the existing item's id + createdAt when we can match by ID;
    // that way unchanged items stay unchanged in storage.
    const matched = p.sourceItemId
      ? existingItems.find(i => i.id === p.sourceItemId)
      : undefined;

    const id = matched?.id ?? newId();
    const createdAt = matched?.createdAt ?? now;

    if (p.kind === 'verse') {
      // Imported markdown gives us reference + per-verse text but not the
      // chapter / book / work metadata. Look up the first verse against
      // the bundled corpus to recover that context. If the lookup fails
      // (hand-edited reference, unrecognized standard work), we still
      // store the item — it just won't have a working `Open` deep link.
      const found = matchByReferenceAndVerse(p.reference, p.verses[0]?.verse);
      const item: StackItemVerse = {
        id,
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
        createdAt,
      };
      return item;
    }
    const item: StackItemNote = {
      id,
      stackId: preview.targetStackId,
      kind: 'note',
      headline: p.headline,
      body: p.body,
      createdAt,
    };
    return item;
  });

  // Authoritative replacement: drop any prior items belonging to this stack.
  const otherItems = get().items.filter(
    i => i.stackId !== preview.targetStackId
  );
  const items = [...otherItems, ...newItems];

  let stacks: Stack[];
  let action: 'created' | 'updated';

  if (existingStack) {
    stacks = get().stacks.map(s =>
      s.id === existingStack.id
        ? {
            ...s,
            title: preview.title,
            itemIds: newItems.map(i => i.id),
            updatedAt: now,
          }
        : s
    );
    action = 'updated';
  } else {
    const newStack: Stack = {
      id: preview.targetStackId,
      title: preview.title,
      status: 'baking',
      itemIds: newItems.map(i => i.id),
      createdAt: now,
      updatedAt: now,
    };
    stacks = [newStack, ...get().stacks];
    action = 'created';
  }

  set({stacks, items});
  persist({stacks, items});

  return {
    stackId: preview.targetStackId,
    action,
    itemCount: newItems.length,
  };
}

function buildVerseSetItem(stackId: string, verses: Verse[]): StackItemVerse {
  if (verses.length === 0) {
    throw new Error('addVerseSetToStack: empty verses array');
  }
  const sorted = [...verses].sort((a, b) => a.verse - b.verse);
  const first = sorted[0];
  // Same-chapter invariant. Caller (picker / verse-context view) guarantees
  // it; we trust it here and don't filter, so a violation throws loudly.
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

/**
 * One-shot migration from the pre-grouped verse shape (single `verseText`
 * field, no `verses` array) to the v2 verse-set shape. Looks up the
 * reference against the bundled corpus to fill in chapter / book / work
 * metadata. Items already in the new shape pass through untouched.
 */
function migrateItems(rawItems: StackItem[]): {
  items: StackItem[];
  migrated: boolean;
} {
  let migrated = false;
  let bundleIndex: Map<string, Verse> | null = null;

  const items = rawItems.map(item => {
    if (item.kind !== 'verse') return item;
    if (Array.isArray((item as StackItemVerse).verses)) return item;

    migrated = true;
    if (!bundleIndex) {
      bundleIndex = new Map();
      for (const v of allVerses()) bundleIndex.set(v.reference, v);
    }
    return migrateLegacyVerseItem(item as unknown as LegacyVerseItem, bundleIndex);
  });

  return {items, migrated};
}

interface LegacyVerseItem {
  id: string;
  stackId: string;
  kind: 'verse';
  headline?: string;
  reference: string;
  url?: string;
  /** Old shape: single verse text. May also be `text` on very old data. */
  verseText?: string;
  text?: string;
  thought?: string;
  createdAt: number;
}

function migrateLegacyVerseItem(
  legacy: LegacyVerseItem,
  bundleIndex: Map<string, Verse>
): StackItemVerse {
  const reference = legacy.reference;
  const verseText = legacy.verseText ?? legacy.text ?? '';
  const found = bundleIndex.get(reference);

  if (found) {
    return {
      id: legacy.id,
      stackId: legacy.stackId,
      kind: 'verse',
      headline: legacy.headline?.trim() || reference,
      reference,
      url: buildVerseSetUrl([found]),
      standardWorkSlug: found.standardWorkSlug,
      bookSlug: found.bookSlug,
      chapter: found.chapter,
      verses: [{verse: found.verse, text: verseText || found.text}],
      thought: legacy.thought ?? '',
      createdAt: legacy.createdAt,
    };
  }

  // Fall back to parsing chapter:verse out of the reference string. Any
  // item that lands here will still display, but Open will use the legacy
  // URL (if any) and the verse number is best-effort.
  const m = /(\d+):(\d+)\s*$/.exec(reference);
  const chapter = m ? parseInt(m[1], 10) : 1;
  const verseNum = m ? parseInt(m[2], 10) : 1;
  return {
    id: legacy.id,
    stackId: legacy.stackId,
    kind: 'verse',
    headline: legacy.headline?.trim() || reference,
    reference,
    url: legacy.url ?? '',
    standardWorkSlug: 'unknown',
    bookSlug: undefined,
    chapter,
    verses: [{verse: verseNum, text: verseText}],
    thought: legacy.thought ?? '',
    createdAt: legacy.createdAt,
  };
}

// Selectors
export const selectStackById =
  (id: string) =>
  (s: StacksState): Stack | undefined =>
    s.stacks.find(stack => stack.id === id);

/**
 * Resolve a stack's items in order. Pure helper — call from a `useMemo` in
 * the component so the array reference is stable across renders that don't
 * actually change the data. Do NOT pass this to `useStacksStore(...)`
 * directly — Zustand's strict-equality default would see a new array each
 * render and trigger an infinite update loop.
 */
export function resolveStackItems(
  stack: Stack | undefined,
  allItems: StackItem[]
): StackItem[] {
  if (!stack) return [];
  return stack.itemIds
    .map(iid => allItems.find(i => i.id === iid))
    .filter((i): i is StackItem => i != null);
}
