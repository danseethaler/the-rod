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

export interface VerseRef {
  /** 1-indexed verse number within the chapter. */
  verse: number;
  /** The scripture text for this single verse. */
  text: string;
}

/**
 * A verse-set item — one or more verses from the **same chapter** treated
 * as a single unit. v1 enforces same-chapter at the call site (the search
 * UI only allows multi-select within a chapter view); cross-chapter sets
 * would require a different deep-link strategy and are out of scope.
 */
export interface StackItemVerse extends StackItemBase {
  kind: 'verse';
  /**
   * Formatted reference covering the whole set — single ("1 Nephi 3:7"),
   * range ("1 Nephi 3:7-9"), or list ("1 Nephi 3:7, 9, 12-14"). Computed
   * from `verses` at write time.
   */
  reference: string;
  /**
   * Gospel Library deep link with every verse in the set highlighted via
   * the `?lang=eng&id=p7,p9-p11#p7` query syntax.
   */
  url: string;
  /** Shared chapter context for the whole set. */
  standardWorkSlug: string;
  bookSlug?: string;
  chapter: number;
  /** Sorted ascending by `verse`. Always non-empty. */
  verses: VerseRef[];
  /**
   * Free-text "your thought" — the Enrich-stage commentary. Verses keep
   * this as a separate field because the verse text is bounded scripture,
   * distinct from the user's reflection on it.
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
