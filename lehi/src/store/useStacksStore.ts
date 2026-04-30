import {create} from 'zustand';

import {newId} from '@/lib/ids';
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
  updateThought: (itemId: string, thought: string) => void;
  removeItem: (itemId: string) => void;
}

const persist = (state: Pick<StacksState, 'stacks' | 'items'>) => {
  saveJson(STORAGE_KEYS.stacks, state.stacks).catch(() => {});
  saveJson(STORAGE_KEYS.stackItems, state.items).catch(() => {});
};

export const useStacksStore = create<StacksState>((set, get) => ({
  hydrated: false,
  stacks: [],
  items: [],

  hydrate: async () => {
    const [stacks, items] = await Promise.all([
      loadJson<Stack[]>(STORAGE_KEYS.stacks, []),
      loadJson<StackItem[]>(STORAGE_KEYS.stackItems, []),
    ]);
    set({stacks, items, hydrated: true});
  },

  createStack: (title) => {
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
    const stacks = get().stacks.map((s) =>
      s.id === id
        ? {...s, title: title.trim() || s.title, updatedAt: Date.now()}
        : s
    );
    set({stacks});
    persist({stacks, items: get().items});
  },

  setStackStatus: (id, status) => {
    const stacks = get().stacks.map((s) =>
      s.id === id ? {...s, status, updatedAt: Date.now()} : s
    );
    set({stacks});
    persist({stacks, items: get().items});
  },

  deleteStack: (id) => {
    const stacks = get().stacks.filter((s) => s.id !== id);
    const items = get().items.filter((i) => i.stackId !== id);
    set({stacks, items});
    persist({stacks, items});
  },

  reorderItems: (stackId, newOrder) => {
    const stacks = get().stacks.map((s) =>
      s.id === stackId
        ? {...s, itemIds: newOrder, updatedAt: Date.now()}
        : s
    );
    set({stacks});
    persist({stacks, items: get().items});
  },

  addVerseToStack: (stackId, verse) => {
    const item: StackItemVerse = {
      id: newId(),
      stackId,
      kind: 'verse',
      reference: verse.reference,
      text: verse.text,
      url: verse.url,
      thought: '',
      createdAt: Date.now(),
    };
    const items = [...get().items, item];
    const stacks = get().stacks.map((s) =>
      s.id === stackId
        ? {...s, itemIds: [...s.itemIds, item.id], updatedAt: Date.now()}
        : s
    );
    set({items, stacks});
    persist({stacks, items});
    return item;
  },

  addNoteToStack: (stackId, body) => {
    const item: StackItemNote = {
      id: newId(),
      stackId,
      kind: 'note',
      body: body.trim(),
      thought: '',
      createdAt: Date.now(),
    };
    const items = [...get().items, item];
    const stacks = get().stacks.map((s) =>
      s.id === stackId
        ? {...s, itemIds: [...s.itemIds, item.id], updatedAt: Date.now()}
        : s
    );
    set({items, stacks});
    persist({stacks, items});
    return item;
  },

  updateNoteBody: (itemId, body) => {
    const items = get().items.map((i) =>
      i.id === itemId && i.kind === 'note' ? {...i, body} : i
    );
    set({items});
    persist({stacks: get().stacks, items});
  },

  updateThought: (itemId, thought) => {
    const items = get().items.map((i) =>
      i.id === itemId ? {...i, thought} : i
    );
    set({items});
    persist({stacks: get().stacks, items});
  },

  removeItem: (itemId) => {
    const item = get().items.find((i) => i.id === itemId);
    if (!item) return;
    const items = get().items.filter((i) => i.id !== itemId);
    const stacks = get().stacks.map((s) =>
      s.id === item.stackId
        ? {
            ...s,
            itemIds: s.itemIds.filter((id) => id !== itemId),
            updatedAt: Date.now(),
          }
        : s
    );
    set({items, stacks});
    persist({stacks, items});
  },
}));

// Selectors
export const selectStackById =
  (id: string) =>
  (s: StacksState): Stack | undefined =>
    s.stacks.find((stack) => stack.id === id);

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
    .map((iid) => allItems.find((i) => i.id === iid))
    .filter((i): i is StackItem => i != null);
}
