/**
 * Verse annotations — a light context layer over the bundled corpus.
 *
 * Granularity is a **chapter range** inside one book. That is deliberate:
 * the question this answers is "who is talking, and what is going on here?"
 * while scanning search results, not verse-by-verse commentary.
 *
 * A row is `[startChapter, endChapter, speaker, context]`.
 *  - `speaker` — the voice of the passage (writer, prophet, the Lord).
 *    Empty string when the passage has no single voice.
 *  - `context` — one short clause on the situation. No trailing period.
 *
 * Rows within a book must be sorted by `startChapter` and must not overlap.
 * Gaps are fine — an unannotated chapter simply shows no context line.
 */
export type AnnotationRow = readonly [
  startChapter: number,
  endChapter: number,
  speaker: string,
  context: string,
];

/** Keyed by `lds_slug` of the book. D&C uses the empty string (no books). */
export type BookAnnotations = Record<string, readonly AnnotationRow[]>;

export interface Annotation {
  speaker: string;
  context: string;
}
