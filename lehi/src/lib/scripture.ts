import {filter} from '@/lib/lodashLite';
import {getAllFlatVerses} from '@/data/conversion.utils';
import type {StandardWorksFlatVerse} from '@/data/data.types';
import type {StackItemVerse, Verse, VerseRef} from '@/lib/types';

// Bundled scripture corpus. Loaded once at module evaluation.
const ALL_VERSES = getAllFlatVerses() as Verse[];

const BASE_URL = 'https://www.churchofjesuschrist.org/study/scriptures';

export const allVerses = (): Verse[] => ALL_VERSES;

/**
 * Resolve every verse in the same chapter (or section, for D&C) as the given
 * verse, sorted by verse number. Used by the verse-context view.
 */
export function getChapterVerses(
  standardWorkSlug: string,
  bookSlug: string | undefined,
  chapter: number
): Verse[] {
  const targetBook = bookSlug ?? '';
  return filter(
    ALL_VERSES,
    (v) =>
      v.standardWorkSlug === standardWorkSlug &&
      (v.bookSlug ?? '') === targetBook &&
      v.chapter === chapter
  ).sort((a, b) => a.verse - b.verse);
}

/**
 * Resolve a single verse's canonical text from the bundled corpus —
 * used by Reset to restore a verse the user has edited inline.
 */
export function getCanonicalVerseText(
  standardWorkSlug: string,
  bookSlug: string | undefined,
  chapter: number,
  verse: number
): string | undefined {
  const targetBook = bookSlug ?? '';
  const found = ALL_VERSES.find(
    v =>
      v.standardWorkSlug === standardWorkSlug &&
      (v.bookSlug ?? '') === targetBook &&
      v.chapter === chapter &&
      v.verse === verse
  );
  return found?.text;
}

/**
 * Best-effort chapter title — e.g. "1 Nephi 3" from "1 Nephi 3:7", or
 * "D&C 4" from "D&C 4:2". Strips any verse range after the colon.
 */
export function chapterTitleFromReference(reference: string): string {
  const colon = reference.indexOf(':');
  return colon === -1 ? reference : reference.slice(0, colon);
}

export function buildVerseUrl(v: Verse | StandardWorksFlatVerse): string {
  const base = v.bookSlug
    ? `${BASE_URL}/${v.standardWorkSlug}/${v.bookSlug}/${v.chapter}`
    : `${BASE_URL}/${v.standardWorkSlug}/${v.chapter}`;
  return `${base}?lang=eng&id=p${v.verse}#p${v.verse}`;
}

/**
 * Build the Gospel Library deep link that highlights every verse in the
 * set. Format: `…/<chapter>?lang=eng&id=p7,p9-p11#p7` per the official
 * deep-linking spec. Verses must all share standardWorkSlug + bookSlug +
 * chapter; the caller enforces that invariant.
 */
export function buildVerseSetUrl(
  verses: readonly Pick<Verse, 'verse' | 'chapter' | 'bookSlug' | 'standardWorkSlug'>[]
): string {
  if (verses.length === 0) {
    throw new Error('buildVerseSetUrl: empty verses array');
  }
  const sorted = [...verses].sort((a, b) => a.verse - b.verse);
  const first = sorted[0];
  const base = first.bookSlug
    ? `${BASE_URL}/${first.standardWorkSlug}/${first.bookSlug}/${first.chapter}`
    : `${BASE_URL}/${first.standardWorkSlug}/${first.chapter}`;
  const idParam = compressRanges(sorted.map(v => v.verse))
    .map(seg => (seg.start === seg.end ? `p${seg.start}` : `p${seg.start}-p${seg.end}`))
    .join(',');
  return `${base}?lang=eng&id=${idParam}#p${first.verse}`;
}

/**
 * Format a multi-verse reference string from the chapter title + sorted
 * verse numbers. Examples: "1 Nephi 3:7", "1 Nephi 3:7-9",
 * "1 Nephi 3:7, 9, 12-14".
 */
export function buildVerseSetReference(
  chapterTitle: string,
  verseNumbers: readonly number[]
): string {
  if (verseNumbers.length === 0) {
    throw new Error('buildVerseSetReference: empty verses array');
  }
  const sorted = [...verseNumbers].sort((a, b) => a - b);
  const segs = compressRanges(sorted)
    .map(seg => (seg.start === seg.end ? `${seg.start}` : `${seg.start}-${seg.end}`))
    .join(', ');
  return `${chapterTitle}:${segs}`;
}

/** Collapse a sorted, deduped list of integers into contiguous ranges. */
function compressRanges(
  sorted: readonly number[]
): {start: number; end: number}[] {
  const out: {start: number; end: number}[] = [];
  for (const n of sorted) {
    const last = out[out.length - 1];
    if (last && n === last.end + 1) {
      last.end = n;
    } else if (!last || n !== last.end) {
      out.push({start: n, end: n});
    }
  }
  return out;
}

/**
 * Single-verse blockquote — used by the search-list "Copy" button. Emits
 * the same one-line shape the old format produced so anything pasted
 * directly into a note still reads as a clean quote: `> [ref](url) — text`.
 */
export function buildMarkdownBlockquote(v: Verse): string {
  return `> [${v.reference}](${buildVerseUrl(v)}) — ${v.text}`;
}

/**
 * Render a verse-set item as a Bear-friendly blockquote. First line is
 * `> [ref](url)`; each verse follows on its own `> N — text` line so the
 * round-trip parser can reconstruct the set.
 */
export function buildMarkdownBlockquoteForSet(item: StackItemVerse): string {
  const lines = [`> [${item.reference}](${item.url})`];
  for (const v of item.verses) {
    lines.push(`> ${v.verse} — ${v.text}`);
  }
  return lines.join('\n');
}

/**
 * Convenience — compute the formatted reference string ("1 Nephi 3:7-9")
 * straight from a `Verse[]`, deriving the chapter title from the first
 * verse's reference.
 */
export function previewSetReference(verses: readonly Verse[]): string {
  if (verses.length === 0) return '';
  const sorted = [...verses].sort((a, b) => a.verse - b.verse);
  const chapterTitle = chapterTitleFromReference(sorted[0].reference);
  return buildVerseSetReference(
    chapterTitle,
    sorted.map(v => v.verse)
  );
}

export function verseRefsFrom(verses: readonly Verse[]): VerseRef[] {
  return [...verses]
    .sort((a, b) => a.verse - b.verse)
    .map(v => ({verse: v.verse, text: v.text}));
}

export interface SearchResult {
  verses: Verse[];
  total: number;
  durationMs: number;
}

const RESULT_LIMIT = 25;

/**
 * Pure search function — exact substring (default) or whole-word.
 * Used by both the Search tab and the Filter step in stack composition.
 */
export function searchVerses(
  query: string,
  options: {wholeWord?: boolean} = {}
): SearchResult {
  const trimmed = query.trim();
  if (trimmed.length < 3) {
    return {verses: [], total: 0, durationMs: 0};
  }

  const start = Date.now();
  const lower = trimmed.toLowerCase();

  let matched: Verse[];

  if (options.wholeWord) {
    const re = new RegExp(`(\\W|^)${escapeRegex(trimmed)}(\\W|$)`, 'i');
    matched = filter(ALL_VERSES, (v) => re.test(v.text));
  } else {
    matched = filter(
      ALL_VERSES,
      (v) =>
        v.filterText.includes(lower) ||
        v.reference.toLowerCase().includes(lower)
    );
  }

  return {
    verses: matched.slice(0, RESULT_LIMIT),
    total: matched.length,
    durationMs: Date.now() - start,
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
