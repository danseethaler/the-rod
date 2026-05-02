/**
 * Constrained inline editing for verse text. Verses are stored as
 * Bear-flavored markdown strings — bold (`**`), italic (`_`), underline
 * (`~`), highlight (`==`), and a literal `…` for user-applied trims.
 * The parser/serializer below round-trip cleanly so the same string can
 * be exported to Bear, edited there, and re-imported without the format
 * shifting underfoot.
 *
 * The model is per-character format flags. That keeps the transforms
 * (toggle a range, trim a range) trivial — we just mutate flags or
 * splice the display string, then re-emit the markdown.
 */

export interface CharFormat {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  highlight: boolean;
}

export interface ParsedVerse {
  /** The text the reader sees, with `…` preserved as a literal character. */
  display: string;
  /** Same length as `display`. Format flags per character. */
  formats: CharFormat[];
}

const EMPTY: CharFormat = {
  bold: false,
  italic: false,
  underline: false,
  highlight: false,
};

export function emptyFormat(): CharFormat {
  return {...EMPTY};
}

/**
 * Parse a verse markdown string into display text + per-char format flags.
 * Order of marker recognition matters: `**` and `==` and `~~` are checked
 * before their single-char counterparts so we don't misread `**` as two
 * starts of an unknown italic-of-underscore.
 */
export function parseVerseMarkdown(md: string): ParsedVerse {
  const display: string[] = [];
  const formats: CharFormat[] = [];
  const state: CharFormat = emptyFormat();

  let i = 0;
  while (i < md.length) {
    if (md.startsWith('**', i)) {
      state.bold = !state.bold;
      i += 2;
      continue;
    }
    if (md.startsWith('==', i)) {
      state.highlight = !state.highlight;
      i += 2;
      continue;
    }
    if (md.startsWith('~~', i)) {
      // Strikethrough — Bear/MD standard, but Krumb doesn't expose it.
      // Skip the markers so the text inside still renders, and don't
      // toggle any of our flags. Round-trips are not lossless for
      // strikethrough; users editing in Bear should know it'll silently
      // strip on the next round-trip.
      i += 2;
      continue;
    }
    if (md[i] === '_') {
      state.italic = !state.italic;
      i += 1;
      continue;
    }
    if (md[i] === '~') {
      state.underline = !state.underline;
      i += 1;
      continue;
    }
    display.push(md[i]);
    formats.push({...state});
    i += 1;
  }

  return {display: display.join(''), formats};
}

/**
 * Serialize display text + per-char format flags back into markdown,
 * collapsing runs of identical state into single marker pairs.
 */
export function serializeVerseMarkdown(parsed: ParsedVerse): string {
  const {display, formats} = parsed;
  let out = '';
  const cur = emptyFormat();

  const close = (kind: keyof CharFormat) => {
    if (kind === 'bold') out += '**';
    else if (kind === 'italic') out += '_';
    else if (kind === 'underline') out += '~';
    else if (kind === 'highlight') out += '==';
    cur[kind] = false;
  };
  const open = (kind: keyof CharFormat) => {
    if (kind === 'bold') out += '**';
    else if (kind === 'italic') out += '_';
    else if (kind === 'underline') out += '~';
    else if (kind === 'highlight') out += '==';
    cur[kind] = true;
  };

  for (let i = 0; i < display.length; i += 1) {
    const f = formats[i];
    // Close in reverse-of-open order so nesting is consistent across runs.
    if (cur.bold && !f.bold) close('bold');
    if (cur.highlight && !f.highlight) close('highlight');
    if (cur.underline && !f.underline) close('underline');
    if (cur.italic && !f.italic) close('italic');
    // Open new ones.
    if (!cur.italic && f.italic) open('italic');
    if (!cur.underline && f.underline) open('underline');
    if (!cur.highlight && f.highlight) open('highlight');
    if (!cur.bold && f.bold) open('bold');
    out += display[i];
  }
  // Close any still-open formats.
  if (cur.bold) close('bold');
  if (cur.highlight) close('highlight');
  if (cur.underline) close('underline');
  if (cur.italic) close('italic');
  return out;
}

// ---------------------------------------------------------------------------
// Word-level tokenization for the selection UI.
// ---------------------------------------------------------------------------

export interface DisplayToken {
  text: string;
  /** Inclusive index into `ParsedVerse.display`. */
  start: number;
  /** Exclusive index. */
  end: number;
  /** True for tappable words; false for whitespace and lone punctuation. */
  isWord: boolean;
}

/**
 * Split the display text into tokens. Whitespace is its own token (so
 * formatting + trim transforms keep their character ranges aligned with
 * the display string). The ellipsis `…` is treated as a word so the
 * user can re-select it if they want to extend a trim.
 */
export function tokenizeDisplay(display: string): DisplayToken[] {
  const tokens: DisplayToken[] = [];
  let i = 0;
  while (i < display.length) {
    const ch = display[i];
    if (/\s/.test(ch)) {
      let j = i;
      while (j < display.length && /\s/.test(display[j])) j += 1;
      tokens.push({text: display.slice(i, j), start: i, end: j, isWord: false});
      i = j;
    } else {
      let j = i;
      while (j < display.length && !/\s/.test(display[j])) j += 1;
      tokens.push({text: display.slice(i, j), start: i, end: j, isWord: true});
      i = j;
    }
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Transforms — selection ranges are character-indexed into `display`.
// ---------------------------------------------------------------------------

export type FormatKind = 'bold' | 'italic' | 'underline' | 'highlight';

/**
 * Toggle a format over `[start, end)`. Toggle semantics: if every
 * character in the range already has the format, clear it; otherwise
 * set it. Matches the typical word-processor behavior.
 */
export function toggleFormatInRange(
  parsed: ParsedVerse,
  start: number,
  end: number,
  kind: FormatKind
): ParsedVerse {
  if (start >= end) return parsed;
  const formats = parsed.formats.map(f => ({...f}));
  let allOn = true;
  for (let i = start; i < end; i += 1) {
    if (!formats[i][kind]) {
      allOn = false;
      break;
    }
  }
  for (let i = start; i < end; i += 1) {
    formats[i] = {...formats[i], [kind]: !allOn};
  }
  return {display: parsed.display, formats};
}

/**
 * Replace `[start, end)` with a single `…`. Collapses surrounding
 * whitespace so we don't end up with `word  …  word` or `… …`.
 *
 * Whitespace handling rules:
 *  - If the selection has whitespace on both sides, keep one space + … +
 *    one space.
 *  - If the resulting `…` lands adjacent to an existing `…`, collapse
 *    them into one (so trimming twice doesn't stack ellipses).
 */
export function trimRange(
  parsed: ParsedVerse,
  start: number,
  end: number
): ParsedVerse {
  if (start >= end) return parsed;
  const before = parsed.display.slice(0, start);
  const after = parsed.display.slice(end);
  const beforeFormats = parsed.formats.slice(0, start);
  const afterFormats = parsed.formats.slice(end);

  // The ellipsis carries the format state of the first char of the
  // selection — visually neutral; the user can still toggle later.
  const seedFormat = parsed.formats[start] ?? emptyFormat();

  let middle = '…';
  let middleFormats: CharFormat[] = [{...seedFormat}];

  // Eat trailing whitespace on `before` if `after` starts with whitespace
  // (so we don't end up with two spaces around the ellipsis).
  let trimmedBefore = before;
  let trimmedBeforeFormats = beforeFormats;
  let trimmedAfter = after;
  let trimmedAfterFormats = afterFormats;

  if (
    trimmedBefore.length > 0 &&
    /\s/.test(trimmedBefore[trimmedBefore.length - 1]) &&
    trimmedAfter.length > 0 &&
    /\s/.test(trimmedAfter[0])
  ) {
    // Drop the trailing space on `before` — keep the leading on `after`.
    trimmedBefore = trimmedBefore.slice(0, -1);
    trimmedBeforeFormats = trimmedBeforeFormats.slice(0, -1);
  }

  // Collapse `… …` if the new ellipsis ends up adjacent to an existing
  // one (with optional whitespace between).
  const collapseLeading = /…\s*$/.exec(trimmedBefore);
  if (collapseLeading) {
    const cut = collapseLeading[0].length;
    trimmedBefore = trimmedBefore.slice(0, -cut);
    trimmedBeforeFormats = trimmedBeforeFormats.slice(0, -cut);
  }
  const collapseTrailing = /^\s*…/.exec(trimmedAfter);
  if (collapseTrailing) {
    const cut = collapseTrailing[0].length;
    trimmedAfter = trimmedAfter.slice(cut);
    trimmedAfterFormats = trimmedAfterFormats.slice(cut);
  }

  // Don't leave a leading or trailing ellipsis with no surrounding text.
  // (We still allow it — e.g., "…the rod" — but we strip pure-whitespace
  // boundaries so the final string isn't padded oddly.)
  if (trimmedBefore.length === 0) {
    // Drop any whitespace `after` would now duplicate.
    middle = '…';
    middleFormats = [{...seedFormat}];
  }
  if (trimmedAfter.length === 0) {
    middle = '…';
    middleFormats = [{...seedFormat}];
  }

  return {
    display: trimmedBefore + middle + trimmedAfter,
    formats: [...trimmedBeforeFormats, ...middleFormats, ...trimmedAfterFormats],
  };
}

/**
 * Replace everything *outside* `[start, end)` with `…`. Mirror of
 * `trimRange` — useful when the user picks the one phrase they want to
 * quote and wants the rest collapsed. Adds a leading `…` if there was
 * content before, a trailing `…` if there was content after, and
 * strips whitespace at the kept-section's edges so the spacing reads
 * cleanly.
 *
 * If both before and after are empty (selection covers the whole
 * verse), this is a no-op.
 */
export function keepOnlyRange(
  parsed: ParsedVerse,
  start: number,
  end: number
): ParsedVerse {
  if (start >= end) return parsed;

  const middle = parsed.display.slice(start, end);
  const middleFormats = parsed.formats.slice(start, end);

  // Strip whitespace at the kept-section boundaries so the ellipses
  // don't end up adjacent to inner whitespace.
  let lo = 0;
  let hi = middle.length;
  while (lo < hi && /\s/.test(middle[lo])) lo += 1;
  while (hi > lo && /\s/.test(middle[hi - 1])) hi -= 1;
  const cleanMiddle = middle.slice(lo, hi);
  const cleanFormats = middleFormats.slice(lo, hi);

  const hasBefore = parsed.display.slice(0, start).trim().length > 0;
  const hasAfter = parsed.display.slice(end).trim().length > 0;
  if (!hasBefore && !hasAfter) return parsed;

  const seedFormat = cleanFormats[0] ?? emptyFormat();
  const tailFormat =
    cleanFormats[cleanFormats.length - 1] ?? seedFormat;

  const display: string[] = [];
  const formats: CharFormat[] = [];

  if (hasBefore) {
    display.push('…', ' ');
    formats.push({...seedFormat}, emptyFormat());
  }
  for (let i = 0; i < cleanMiddle.length; i += 1) {
    display.push(cleanMiddle[i]);
    formats.push(cleanFormats[i]);
  }
  if (hasAfter) {
    display.push(' ', '…');
    formats.push(emptyFormat(), {...tailFormat});
  }

  return {display: display.join(''), formats};
}

// ---------------------------------------------------------------------------
// Helpers for the UI
// ---------------------------------------------------------------------------

/**
 * Whether every char in `[start, end)` has `kind` set — used to render
 * format buttons in their "active" state.
 */
export function rangeHasFormat(
  parsed: ParsedVerse,
  start: number,
  end: number,
  kind: FormatKind
): boolean {
  if (start >= end) return false;
  for (let i = start; i < end; i += 1) {
    if (!parsed.formats[i][kind]) return false;
  }
  return true;
}
