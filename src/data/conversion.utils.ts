import {flatten, flattenDeep} from 'lodash';
import {StandardWork, StandardWorksFlatVerse} from './data.types';
import bookOfMormon from './raw/book-of-mormon';
import doctrineAndCovenants from './raw/doctrine-and-covenants';
import newTestament from './raw/new-testament';
import oldTestament from './raw/old-testament';
import pearlOfGreatPrice from './raw/pearl-of-great-price';

const convertVerses = (
  standardWork: StandardWork
): StandardWorksFlatVerse[] => {
  if (standardWork.sections) {
    return flattenDeep(
      standardWork.sections.map(section => {
        return section.verses.map((verse): StandardWorksFlatVerse => {
          return {
            ...verse,
            filterText: verse.text.toLowerCase(),
            label: verse.reference,
            chapter: section.section,
            standardWorkSlug: standardWork.lds_slug,
          };
        });
      })
    );
  }

  if (standardWork.books) {
    return flattenDeep(
      standardWork.books.map(book => {
        return book.chapters.map(chapter => {
          return chapter.verses.map((verse): StandardWorksFlatVerse => {
            return {
              ...verse,
              filterText: verse.text.toLowerCase(),
              label: verse.reference,
              chapter: chapter.chapter,
              bookSlug: book.lds_slug,
              standardWorkSlug: standardWork.lds_slug,
            };
          });
        });
      })
    );
  }

  return [];
};

export const getAllFlatVerses = () =>
  flatten([
    convertVerses(bookOfMormon),
    convertVerses(doctrineAndCovenants),
    convertVerses(pearlOfGreatPrice),
    convertVerses(newTestament),
    convertVerses(oldTestament),
  ]);
