import {buildMarkdownBlockquoteForSet} from '@/lib/scripture';
import type {Section, Stack, StackItem, VerseRef} from '@/lib/types';

/**
 * Verse header line — `> [ref](url)` with no trailing text. The verse-set
 * export emits this on its own line, with each individual verse on a
 * subsequent `> N — text` line.
 */
const VERSE_HEADER_RE = /^>\s*\[([^\]]+)\]\(([^)]+)\)\s*$/;

/** Per-verse blockquote line within a verse set: `> 7 — text` or `> 7. text`. */
const VERSE_BODY_RE = /^>\s*(\d+)\s*[—\-.]\s*(.+)$/;

/**
 * Legacy single-line verse blockquote: `> [ref](url) — text`. Still parsed
 * for backward compatibility with markdown exported by older versions.
 */
const LEGACY_VERSE_LINE_RE = /^>\s*\[([^\]]+)\]\(([^)]+)\)\s*[—-]\s*(.+)$/;

/**
 * Render a stack to Bear-friendly markdown. Format is pure heading-driven —
 * no HTML-comment markers — so the output reads naturally inside Bear and
 * round-trips by **title** alone.
 *
 *   # Stack title
 *
 *   ## Section title
 *
 *   Optional section description.
 *
 *   ### Item headline
 *
 *   > [Reference](url)
 *   > 7 — verse text
 *
 *   Optional thought.
 *
 *   ### Another item
 *
 *   note body
 */
export function stackToMarkdown(
  stack: Stack,
  sections: Section[],
  items: StackItem[]
): string {
  const orderedSections = stack.sectionIds
    .map(id => sections.find(s => s.id === id))
    .filter((s): s is Section => s != null);

  const parts: string[] = [`# ${stack.title}`, ''];

  for (const section of orderedSections) {
    parts.push(`## ${section.title.trim()}`, '');
    const body = section.body.trim();
    if (body) {
      parts.push(body, '');
    }

    const orderedItems = section.itemIds
      .map(id => items.find(i => i.id === id))
      .filter((i): i is StackItem => i != null);

    for (const item of orderedItems) {
      parts.push(itemToMarkdown(item));
    }
  }

  return parts.join('\n').trim() + '\n';
}

/**
 * Serialize a single item the same way a full export does. Used by the
 * per-item "Copy as markdown" action so the copy is a drop-in fragment
 * of a full stack export.
 */
export function itemToMarkdown(item: StackItem): string {
  const headline = item.headline.trim() || fallbackHeadline(item);
  const parts: string[] = [`### ${headline}`, ''];

  if (item.kind === 'verse') {
    parts.push(buildMarkdownBlockquoteForSet(item), '');
    const thought = item.thought.trim();
    if (thought) parts.push(thought, '');
  } else {
    const body = item.body.trim();
    if (body) parts.push(body, '');
  }

  return parts.join('\n');
}

function fallbackHeadline(item: StackItem): string {
  if (item.kind === 'verse') return item.reference;
  return 'Untitled note';
}

/**
 * Build a Bear x-callback URL that creates (or appends to) a note.
 * https://bear.app/faq/x-callback-url-scheme-documentation/
 */
export function bearCreateUrl(title: string, body: string): string {
  const params = new URLSearchParams({
    title,
    text: body,
    open_note: 'yes',
    show_window: 'yes',
  });
  return `bear://x-callback-url/create?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Parser — clipboard markdown back into stack shape
// ---------------------------------------------------------------------------

export interface ParsedVerseItem {
  kind: 'verse';
  headline: string;
  reference: string;
  url: string;
  /** Sorted ascending by `verse`. Always non-empty for a parsed verse item. */
  verses: VerseRef[];
  thought: string;
}

export interface ParsedNoteItem {
  kind: 'note';
  headline: string;
  body: string;
}

export type ParsedStackItem = ParsedVerseItem | ParsedNoteItem;

export interface ParsedSection {
  title: string;
  body: string;
  items: ParsedStackItem[];
}

export interface ParsedStack {
  title: string;
  sections: ParsedSection[];
}

export class MarkdownParseError extends Error {}

/**
 * Parse markdown back into a stack shape. Pure heading-driven — H1 = stack
 * title, H2 = section, H3 = item. Sections own a body paragraph (anything
 * between the H2 line and the first H3); items own their content (verse
 * blockquote + optional thought, or free-text note body).
 *
 * If the markdown has H3s before any H2, the parser auto-creates a single
 * anonymous section to hold them. Markdown with no H1 throws.
 */
export function markdownToStack(md: string): ParsedStack {
  if (!md || !md.trim()) {
    throw new MarkdownParseError('Clipboard is empty.');
  }

  const titleMatch = md.match(/^#\s+(.+)$/m);
  if (!titleMatch) {
    throw new MarkdownParseError(
      'No title found. The first heading must be `# Stack title`.'
    );
  }
  const title = titleMatch[1].trim();
  const afterTitle = md.slice((titleMatch.index ?? 0) + titleMatch[0].length);

  const sectionMatches = Array.from(afterTitle.matchAll(/^##\s+(.*)$/gm));
  const sections: ParsedSection[] = [];

  if (sectionMatches.length === 0) {
    // No H2s at all — anything left over (possibly H3s without a section)
    // gets folded into a leading anonymous section.
    const block = afterTitle.trim();
    if (block) sections.push(parseSection('', block));
  } else {
    const leading = afterTitle.slice(0, sectionMatches[0].index ?? 0).trim();
    if (leading) sections.push(parseSection('', leading));
    for (let i = 0; i < sectionMatches.length; i += 1) {
      const m = sectionMatches[i];
      const sectionTitle = m[1].trim();
      const sectionStart = (m.index ?? 0) + m[0].length;
      const sectionEnd =
        i + 1 < sectionMatches.length
          ? (sectionMatches[i + 1].index ?? afterTitle.length)
          : afterTitle.length;
      const block = afterTitle.slice(sectionStart, sectionEnd);
      sections.push(parseSection(sectionTitle, block));
    }
  }

  return {title, sections};
}

function parseSection(title: string, block: string): ParsedSection {
  const itemMatches = Array.from(block.matchAll(/^###\s+(.+)$/gm));

  let body = '';
  const items: ParsedStackItem[] = [];

  if (itemMatches.length === 0) {
    body = block.trim();
  } else {
    body = block.slice(0, itemMatches[0].index ?? 0).trim();
    for (let i = 0; i < itemMatches.length; i += 1) {
      const m = itemMatches[i];
      const headline = stripDecorativeNumber(m[1].trim());
      const itemStart = (m.index ?? 0) + m[0].length;
      const itemEnd =
        i + 1 < itemMatches.length
          ? (itemMatches[i + 1].index ?? block.length)
          : block.length;
      const itemBody = block.slice(itemStart, itemEnd).trim();
      items.push(parseItem(headline, itemBody));
    }
  }

  return {title, body, items};
}

/** Strip a leading "1. " / "12. " — tolerated for legacy outputs. */
function stripDecorativeNumber(s: string): string {
  return s.replace(/^\d+\.\s+/, '').trim();
}

function parseItem(headline: string, body: string): ParsedStackItem {
  const lines = body.split('\n');
  const firstNonEmptyIdx = lines.findIndex(l => l.trim().length > 0);
  const firstNonEmpty =
    firstNonEmptyIdx >= 0 ? lines[firstNonEmptyIdx].trim() : '';

  // Multi-verse format first: `> [ref](url)` header line followed by
  // one or more `> N — text` body lines.
  const headerMatch = VERSE_HEADER_RE.exec(firstNonEmpty);
  if (headerMatch) {
    const [, reference, url] = headerMatch;
    const verses: VerseRef[] = [];
    let cursor = firstNonEmptyIdx + 1;
    for (; cursor < lines.length; cursor += 1) {
      const trimmed = lines[cursor].trim();
      if (trimmed === '') {
        if (
          cursor + 1 < lines.length &&
          lines[cursor + 1].trim().startsWith('>')
        ) {
          continue;
        }
        break;
      }
      const m = VERSE_BODY_RE.exec(trimmed);
      if (!m) break;
      verses.push({verse: parseInt(m[1], 10), text: m[2].trim()});
    }
    if (verses.length > 0) {
      const thought = lines.slice(cursor).join('\n').trim();
      verses.sort((a, b) => a.verse - b.verse);
      return {
        kind: 'verse',
        headline: headline || reference.trim(),
        reference: reference.trim(),
        url: url.trim(),
        verses,
        thought,
      };
    }
    const thought = lines
      .slice(firstNonEmptyIdx + 1)
      .join('\n')
      .trim();
    return {
      kind: 'verse',
      headline: headline || reference.trim(),
      reference: reference.trim(),
      url: url.trim(),
      verses: [{verse: 1, text: ''}],
      thought,
    };
  }

  // Legacy single-line format: `> [ref](url) — text`.
  const legacyMatch = LEGACY_VERSE_LINE_RE.exec(firstNonEmpty);
  if (legacyMatch) {
    const [, reference, url, text] = legacyMatch;
    const thought = lines
      .slice(firstNonEmptyIdx + 1)
      .join('\n')
      .trim();
    return {
      kind: 'verse',
      headline: headline || reference.trim(),
      reference: reference.trim(),
      url: url.trim(),
      verses: [
        {verse: extractFirstVerseNumber(reference) ?? 1, text: text.trim()},
      ],
      thought,
    };
  }

  return {
    kind: 'note',
    headline: headline || firstLine(body) || 'Note',
    body: body.trim(),
  };
}

function extractFirstVerseNumber(reference: string): number | undefined {
  const m = /:(\d+)/.exec(reference);
  return m ? parseInt(m[1], 10) : undefined;
}

function firstLine(s: string): string {
  return (
    s
      .split('\n')
      .find(l => l.trim().length > 0)
      ?.trim() ?? ''
  );
}

// ---------------------------------------------------------------------------
// Diff — for the import-preview interstitial
// ---------------------------------------------------------------------------

export type DiffStatus = 'unchanged' | 'changed' | 'added' | 'removed';

export interface ItemDiffEntry {
  status: DiffStatus;
  headline: string;
  parsed?: ParsedStackItem;
  existing?: StackItem;
}

export interface SectionDiffEntry {
  status: DiffStatus;
  title: string;
  parsed?: ParsedSection;
  existing?: Section;
  items: ItemDiffEntry[];
}

export interface ImportPreview {
  /**
   * 'create'  = no existing stack matched the title; mint a new one.
   * 'update'  = an existing stack matched by title; sections + items are
   *             replaced authoritatively.
   * 'replace' = explicit replace of a specific stack (from the stack's
   *             own clipboard-import action). Title matching is skipped.
   */
  action: 'create' | 'update' | 'replace';
  targetStackId: string;
  title: string;
  existingTitle?: string;
  parsed: ParsedStack;
  diff: SectionDiffEntry[];
}

export interface ImportContext {
  stacks: ReadonlyArray<Stack>;
  sections: ReadonlyArray<Section>;
  items: ReadonlyArray<StackItem>;
  generateId: () => string;
}

/**
 * Compute a preview for a clipboard import initiated from the Stacks tab.
 * Title-based identity: if any existing stack's title matches the parsed
 * title (trimmed, case-insensitive), action is 'update' against that
 * stack; otherwise 'create'.
 */
export function computeImportPreview(
  parsed: ParsedStack,
  ctx: ImportContext
): ImportPreview {
  const existing = ctx.stacks.find(
    s => normalizeTitle(s.title) === normalizeTitle(parsed.title)
  );
  if (existing) {
    return buildExistingPreview('update', existing, parsed, ctx);
  }
  return {
    action: 'create',
    targetStackId: ctx.generateId(),
    title: parsed.title,
    parsed,
    diff: parsed.sections.map(parsedToSectionDiffAdded),
  };
}

/**
 * Compute a preview for the per-stack "Replace from clipboard" action.
 * The target stack is fixed; title matching is skipped.
 */
export function computeReplacePreview(
  parsed: ParsedStack,
  targetStack: Stack,
  ctx: ImportContext
): ImportPreview {
  return buildExistingPreview('replace', targetStack, parsed, ctx);
}

function buildExistingPreview(
  action: 'update' | 'replace',
  existing: Stack,
  parsed: ParsedStack,
  ctx: ImportContext
): ImportPreview {
  const existingSections = existing.sectionIds
    .map(id => ctx.sections.find(s => s.id === id))
    .filter((s): s is Section => s != null);

  const matchedExistingSectionIds = new Set<string>();
  const diff: SectionDiffEntry[] = [];

  for (const ps of parsed.sections) {
    const match = existingSections.find(
      s =>
        !matchedExistingSectionIds.has(s.id) &&
        normalizeTitle(s.title) === normalizeTitle(ps.title)
    );
    if (match) {
      matchedExistingSectionIds.add(match.id);
      diff.push(buildSectionDiffMatched(ps, match, ctx));
    } else {
      diff.push(parsedToSectionDiffAdded(ps));
    }
  }

  for (const es of existingSections) {
    if (!matchedExistingSectionIds.has(es.id)) {
      diff.push(existingToSectionDiffRemoved(es, ctx));
    }
  }

  return {
    action,
    targetStackId: existing.id,
    title: parsed.title,
    existingTitle: existing.title,
    parsed,
    diff,
  };
}

function buildSectionDiffMatched(
  parsed: ParsedSection,
  existing: Section,
  ctx: ImportContext
): SectionDiffEntry {
  const existingItems = existing.itemIds
    .map(id => ctx.items.find(i => i.id === id))
    .filter((i): i is StackItem => i != null);

  const matchedExistingItemIds = new Set<string>();
  const items: ItemDiffEntry[] = [];

  for (const p of parsed.items) {
    const match = existingItems.find(
      e =>
        !matchedExistingItemIds.has(e.id) &&
        normalizeTitle(e.headline) === normalizeTitle(p.headline)
    );
    if (match) {
      matchedExistingItemIds.add(match.id);
      items.push({
        status: itemsEqual(p, match) ? 'unchanged' : 'changed',
        headline: p.headline,
        parsed: p,
        existing: match,
      });
    } else {
      items.push({status: 'added', headline: p.headline, parsed: p});
    }
  }

  for (const e of existingItems) {
    if (!matchedExistingItemIds.has(e.id)) {
      items.push({
        status: 'removed',
        headline: e.headline || itemFallback(e),
        existing: e,
      });
    }
  }

  const anyItemChanged = items.some(i => i.status !== 'unchanged');
  const bodyChanged = parsed.body.trim() !== existing.body.trim();
  const status: DiffStatus =
    anyItemChanged || bodyChanged ? 'changed' : 'unchanged';

  return {status, title: parsed.title, parsed, existing, items};
}

function parsedToSectionDiffAdded(parsed: ParsedSection): SectionDiffEntry {
  return {
    status: 'added',
    title: parsed.title,
    parsed,
    items: parsed.items.map(p => ({
      status: 'added' as const,
      headline: p.headline,
      parsed: p,
    })),
  };
}

function existingToSectionDiffRemoved(
  existing: Section,
  ctx: ImportContext
): SectionDiffEntry {
  const existingItems = existing.itemIds
    .map(id => ctx.items.find(i => i.id === id))
    .filter((i): i is StackItem => i != null);
  return {
    status: 'removed',
    title: existing.title,
    existing,
    items: existingItems.map(e => ({
      status: 'removed' as const,
      headline: e.headline || itemFallback(e),
      existing: e,
    })),
  };
}

function itemsEqual(parsed: ParsedStackItem, existing: StackItem): boolean {
  if (parsed.headline.trim() !== existing.headline.trim()) return false;
  if (parsed.kind === 'verse' && existing.kind === 'verse') {
    if (parsed.reference.trim() !== existing.reference.trim()) return false;
    if (parsed.url.trim() !== existing.url.trim()) return false;
    if (parsed.thought.trim() !== existing.thought.trim()) return false;
    if (parsed.verses.length !== existing.verses.length) return false;
    for (let i = 0; i < parsed.verses.length; i += 1) {
      const a = parsed.verses[i];
      const b = existing.verses[i];
      if (a.verse !== b.verse) return false;
      if (a.text.trim() !== b.text.trim()) return false;
    }
    return true;
  }
  if (parsed.kind === 'note' && existing.kind === 'note') {
    return parsed.body.trim() === existing.body.trim();
  }
  return false;
}

function itemFallback(item: StackItem): string {
  if (item.kind === 'verse') return item.reference;
  return firstLine(item.body) || 'Note';
}

function normalizeTitle(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}
