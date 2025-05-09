import {filter} from 'lodash';
import {useState} from 'react';
import {getAllFlatVerses} from '../data/conversion.utils';

const flatVerses = getAllFlatVerses();

const numberOfVersionToShow = 25;

const useFilterItems = () => {
  const [previousFilteredVerses, setPreviousFilteredVerses] =
    useState(flatVerses);
  const [previousSearchString, setPreviousSearchString] = useState('');
  const [previousWholeWord, setPreviousWholeWord] = useState(false);

  return (searchString: string, wholeWord: boolean) => {
    if (searchString.length < 3) {
      return {verses: [], resultCount: 0, duration: 0};
    }

    const searchStringLowercase = searchString.toLowerCase();

    const start = Date.now();

    const searchStringIsInclusive = searchString.includes(previousSearchString);
    const wholeWordChanged = previousWholeWord === true && wholeWord === false;

    const availableVerses =
      searchStringIsInclusive && !wholeWordChanged && !wholeWord
        ? previousFilteredVerses
        : flatVerses;

    let filteredVerses = filter(
      availableVerses,
      verse =>
        verse.filterText.includes(searchStringLowercase) ||
        verse.reference.toLowerCase().includes(searchStringLowercase)
    );

    if (wholeWord) {
      filteredVerses = filter(availableVerses, verse => {
        const regex = `(\\W|^)${searchString.trim()}(\\W|$)`;
        return new RegExp(regex, 'gi').test(verse.text);
      });
    }

    setPreviousSearchString(searchString);
    setPreviousFilteredVerses(filteredVerses);
    setPreviousWholeWord(wholeWord);

    return {
      verses: filteredVerses.slice(0, numberOfVersionToShow),
      resultCount: filteredVerses.length,
      duration: Date.now() - start,
    };
  };
};

export default useFilterItems;
