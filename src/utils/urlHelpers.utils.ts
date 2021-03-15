import { baseReferenceUrl } from "../constants";
import { StandardWorksFlatVerse } from "../data/data.types";

export const buildUrl = (item: StandardWorksFlatVerse) => {
  if (item.bookSlug) {
    return `${baseReferenceUrl}/${item.standardWorkSlug}/${item.bookSlug}/${item.chapter}.${item.verse}`;
  }

  return `${baseReferenceUrl}/${item.standardWorkSlug}/${item.chapter}.${item.verse}`;
};

export const buildCopyText = (item: StandardWorksFlatVerse) => {
  const link = buildUrl(item);
  return `> [${item.reference}](${link})\n> ${item.text}`;
};
