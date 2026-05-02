import {create} from 'zustand';

import {newId} from '@/lib/ids';
import {
  computeImportPreview,
  markdownToStack,
  type ImportPreview,
} from '@/lib/markdown';
import {loadJson, saveJson, STORAGE_KEYS} from '@/lib/storage';
import type {
  Stack,
  StackItem,
  StackItemNote,
  StackItemVerse,
  StackStatus,
  Verse,
} from '@/lib/types';

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
  addVerseToStack: (
    stackId: string,
    verse: Pick<Verse, 'reference' | 'text'> & {url: string}
  ) => StackItemVerse;
  addNoteToStack: (stackId: string, body: string) => StackItemNote;
  updateNoteBody: (itemId: string, body: string) => void;
  updateVerseThought: (itemId: string, thought: string) => void;
  updateHeadline: (itemId: string, headline: string) => void;
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
    const [stacks, items] = await Promise.all([
      loadJson<Stack[]>(STORAGE_KEYS.stacks, []),
      loadJson<StackItem[]>(STORAGE_KEYS.stackItems, []),
    ]);
    set({stacks, items, hydrated: true});
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

  addVerseToStack: (stackId, verse) => {
    const item: StackItemVerse = {
      id: newId(),
      stackId,
      kind: 'verse',
      headline: verse.reference,
      reference: verse.reference,
      verseText: verse.text,
      url: verse.url,
      thought: '',
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
      const item: StackItemVerse = {
        id,
        stackId: preview.targetStackId,
        kind: 'verse',
        headline: p.headline,
        reference: p.reference,
        verseText: p.verseText,
        url: p.url,
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
