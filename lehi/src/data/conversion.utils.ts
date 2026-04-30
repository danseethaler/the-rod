import {flatten} from '@/lib/lodashLite';
import type {StandardWork, StandardWorksFlatVerse} from './data.types';
import bookOfMormon from './raw/book-of-mormon';
import doctrineAndCovenants from './raw/doctrine-and-covenants';
import newTestament from './raw/new-testament';
import oldTestament from './raw/old-testament';
import pearlOfGreatPrice from './raw/pearl-of-great-price';

const convertVerses = (
  standardWork: StandardWork
): StandardWorksFlatVerse[] => {
  if (standardWork.sections) {
    const out: StandardWorksFlatVerse[] = [];
    for (const section of standardWork.sections) {
      for (const verse of section.verses) {
        out.push({
          ...verse,
          filterText: verse.text.toLowerCase(),
          label: verse.reference,
          chapter: section.section,
          standardWorkSlug: standardWork.lds_slug,
        });
      }
    }
    return out;
  }

  if (standardWork.books) {
    const out: StandardWorksFlatVerse[] = [];
    for (const book of standardWork.books) {
      for (const chapter of book.chapters) {
        for (const verse of chapter.verses) {
          out.push({
            ...verse,
            filterText: verse.text.toLowerCase(),
            label: verse.reference,
            chapter: chapter.chapter,
            bookSlug: book.lds_slug,
            standardWorkSlug: standardWork.lds_slug,
          });
        }
      }
    }
    return out;
  }

  return [];
};

let cache: StandardWorksFlatVerse[] | null = null;

export const getAllFlatVerses = (): StandardWorksFlatVerse[] => {
  if (cache) return cache;
  cache = flatten([
    convertVerses(bookOfMormon),
    convertVerses(doctrineAndCovenants),
    convertVerses(pearlOfGreatPrice),
    convertVerses(newTestament),
    convertVerses(oldTestament),
  ]);
  return cache;
};
