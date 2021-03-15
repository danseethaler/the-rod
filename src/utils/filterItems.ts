import { filter } from "lodash";
import { StandardWorksFlatVerse } from "../data/data.types";

const filterItems = (flatVerses: StandardWorksFlatVerse[]) => {
  return (searchString: string, wholeWord: boolean) => {
    if (searchString.length < 3) {
      return { verses: [], resultCount: 0, duration: 0 };
    }

    const searchStringLowercase = searchString.toLowerCase();

    const start = Date.now();
    let filteredVerses = filter(flatVerses, (verse) =>
      verse.filterText.includes(searchStringLowercase)
    );

    if (wholeWord) {
      filteredVerses = filter(filteredVerses, (verse) => {
        const regex = `(\\W|^)${searchString.trim()}(\\W|$)`;
        return new RegExp(regex, "gi").test(verse.text);
      });
    }

    return {
      verses: filteredVerses.slice(0, 10),
      resultCount: filteredVerses.length,
      duration: Date.now() - start,
    };
  };
};

export default filterItems;
