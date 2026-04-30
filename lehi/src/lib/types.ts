// Domain types for The Rod. Single source of truth.

export type StandardWorkSlug =
  | 'old-testament'
  | 'new-testament'
  | 'book-of-mormon'
  | 'doctrine-and-covenants'
  | 'pearl-of-great-price';

export interface Verse {
  reference: string;
  text: string;
  verse: number;
  chapter: number;
  bookSlug?: string;
  standardWorkSlug: string;
  filterText: string;
  label: string;
  heading?: string;
  subheading?: string;
  pilcrow?: true;
}

// A Stack is the user's draft talk — one walking-around idea before pondering.
export interface Stack {
  id: string;
  title: string;
  // "Bake until done" status — Dan's own language from Speaking Principles.
  status: StackStatus;
  itemIds: string[]; // ordered manually by the user
  createdAt: number;
  updatedAt: number;
}

export type StackStatus = 'baking' | 'done' | 'archived';

export const STACK_STATUS_LABEL: Record<StackStatus, string> = {
  baking: 'Bake until done',
  done: 'Done',
  archived: 'Archived',
};

// A StackItem is one piece of the talk: a verse, a personal note, or
// (eventually) a citation. v1 = verse + note.
export type StackItem = StackItemVerse | StackItemNote;

export interface StackItemBase {
  id: string;
  stackId: string;
  /** Free-text "your thought" — the Enrich-stage field. */
  thought: string;
  createdAt: number;
}

export interface StackItemVerse extends StackItemBase {
  kind: 'verse';
  reference: string;
  text: string;
  url: string;
}

export interface StackItemNote extends StackItemBase {
  kind: 'note';
  body: string;
}
