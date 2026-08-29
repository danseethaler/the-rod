import type {BookAnnotations} from './annotations.types';
import {bookOfMormonAnnotations} from './bookOfMormon';
import {doctrineAndCovenantsAnnotations} from './doctrineAndCovenants';
import {newTestamentAnnotations} from './newTestament';
import {oldTestamentAnnotations} from './oldTestament';
import {pearlOfGreatPriceAnnotations} from './pearlOfGreatPrice';

/**
 * Keyed by `standardWorkSlug`, then by book `lds_slug`.
 *
 * These are the corpus's own `lds_slug` values — the same short slugs the
 * Gospel Library URLs use — not the long names in `lib/types.ts`.
 */
export const annotationsByWork: Record<string, BookAnnotations> = {
  ot: oldTestamentAnnotations,
  nt: newTestamentAnnotations,
  bofm: bookOfMormonAnnotations,
  'dc-testament/dc': doctrineAndCovenantsAnnotations,
  pgp: pearlOfGreatPriceAnnotations,
};

export type {Annotation, AnnotationRow, BookAnnotations} from './annotations.types';
