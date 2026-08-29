import {annotationsByWork} from '@/data/annotations';
import type {Annotation, AnnotationRow} from '@/data/annotations';
import type {Verse} from '@/lib/types';

/**
 * Chapter-level context for a verse — who is speaking and what is going on.
 *
 * The corpus itself carries no such metadata, so this is a hand-written
 * layer keyed by standard work → book slug → chapter range. Coverage is
 * deliberately coarse and incomplete; an unannotated chapter returns
 * `undefined` and the UI simply shows nothing.
 */
export type {Annotation};

type ChapterLike = Pick<Verse, 'standardWorkSlug' | 'bookSlug' | 'chapter'>;

const cache = new Map<string, Annotation | undefined>();

function rowFor(
  work: string,
  book: string,
  chapter: number
): AnnotationRow | undefined {
  const rows = annotationsByWork[work]?.[book];
  if (!rows) return undefined;
  return rows.find(([start, end]) => chapter >= start && chapter <= end);
}

export function getAnnotation(v: ChapterLike): Annotation | undefined {
  const book = v.bookSlug ?? '';
  const key = `${v.standardWorkSlug}|${book}|${v.chapter}`;
  if (cache.has(key)) return cache.get(key);

  const row = rowFor(v.standardWorkSlug, book, v.chapter);
  const annotation = row ? {speaker: row[2], context: row[3]} : undefined;
  cache.set(key, annotation);
  return annotation;
}

/**
 * One-line form for the UI: "Nephi · Lehi's dream of the tree of life".
 * Falls back to either half when the other is empty.
 */
export function formatAnnotation(a: Annotation): string {
  if (!a.speaker) return a.context;
  if (!a.context) return a.speaker;
  return `${a.speaker} · ${a.context}`;
}
