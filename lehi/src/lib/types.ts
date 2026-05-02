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
  /**
   * User-editable label shown as the section heading on export and as the
   * item title in the stack detail view. Defaulted from the item's content
   * (verse → reference, note → first line of body) but the user can
   * override it.
   */
  headline: string;
  createdAt: number;
}

export interface StackItemVerse extends StackItemBase {
  kind: 'verse';
  reference: string;
  url: string;
  /** The scripture text itself — what shows in the blockquote. */
  verseText: string;
  /**
   * Free-text "your thought" — the Enrich-stage commentary on the verse.
   * Verses keep this as a separate field because the verse text is bounded
   * scripture, distinct from the user's reflection on it.
   */
  thought: string;
}

export interface StackItemNote extends StackItemBase {
  kind: 'note';
  /**
   * Free-text body. A note IS the user's thought — there is no separate
   * thought field on notes.
   */
  body: string;
}
