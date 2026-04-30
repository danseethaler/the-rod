export interface StandardWork {
  books?: StandardWorksBook[];
  sections?: StandardWorksSection[];
  title: string;
  version: number;
  last_modified: string;
  lds_slug: string;
  subtitle?: string;
  subsubtitle?: string;
  the_end?: string;
  title_page?: {
    subtitle: string;
    title: string;
    translated_by?: string;
    text?: string | string[];
  };
  testimonies?: StandardWorksTestimony[];
}

export interface StandardWorksTestimony {
  title: string;
  text: string;
  witnesses: string[];
}

export interface StandardWorksBook {
  book: string;
  reference?: string;
  section?: number;
  chapters: StandardWorksChapter[];
  full_title: string;
  full_subtitle?: string;
  lds_slug: string;
  heading?: string;
  note?: string;
  facsimiles?: any;
}

export interface StandardWorksChapter {
  chapter: number;
  reference: string;
  verses: StandardWorksVerse[];
  heading?: string;
  note?: string;
}

export interface StandardWorksSection {
  section: number;
  reference: string;
  verses: StandardWorksVerse[];
  signature?: string;
  heading?: string;
  note?: string;
}

export interface StandardWorksVerse {
  reference: string;
  text: string;
  verse: number;
  heading?: string;
  subheading?: string;
  pilcrow?: true;
}

export interface StandardWorksFlatVerse extends StandardWorksVerse {
  label: string;
  filterText: string;
  chapter: number;
  bookSlug?: string;
  standardWorkSlug: string;
}
