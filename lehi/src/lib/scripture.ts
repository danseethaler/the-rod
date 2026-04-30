import {filter} from '@/lib/lodashLite';
import {getAllFlatVerses} from '@/data/conversion.utils';
import type {StandardWorksFlatVerse} from '@/data/data.types';
import type {Verse} from '@/lib/types';

// Bundled scripture corpus. Loaded once at module evaluation.
const ALL_VERSES = getAllFlatVerses() as Verse[];

const BASE_URL = 'https://www.churchofjesuschrist.org/study/scriptures';

export const allVerses = (): Verse[] => ALL_VERSES;

export function buildVerseUrl(v: Verse | StandardWorksFlatVerse): string {
  if (v.bookSlug) {
    return `${BASE_URL}/${v.standardWorkSlug}/${v.bookSlug}/${v.chapter}.${v.verse}`;
  }
  return `${BASE_URL}/${v.standardWorkSlug}/${v.chapter}.${v.verse}`;
}

export function buildMarkdownBlockquote(v: Verse): string {
  const url = buildVerseUrl(v);
  return `> [${v.reference}](${url}) — ${v.text}`;
}

export function buildPlainCopy(v: Verse): string {
  return `${v.reference} — ${v.text}`;
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
