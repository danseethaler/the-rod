import type {Stack, StackItem} from '@/lib/types';

/**
 * Marker emitted at the top of every export, so a clipboard re-import can
 * round-trip back to the same stack instead of duplicating it.
 */
const STACK_MARKER_RE = /<!--\s*krumb:stack:([^\s>]+)\s*-->/;

/** Marker emitted before each `## ` heading, carrying the item's stable ID. */
const ITEM_MARKER_RE = /<!--\s*krumb:item:([^\s>]+)\s*-->/;

/** Matches a verse blockquote line: `> [ref](url) — text` */
const VERSE_LINE_RE = /^>\s*\[([^\]]+)\]\(([^)]+)\)\s*[—-]\s*(.+)$/;

/**
 * Render a stack to Bear-friendly markdown. Output is layout-driven — no
 * body/thought markers — with two HTML-comment markers for round-trip
 * identity:
 *
 *   <!-- krumb:stack:{stack-id} -->     emitted once at the top
 *   <!-- krumb:item:{item-id} -->       emitted before each `## ` heading
 *
 * Comments survive Bear and render as nothing visible.
 */
export function stackToMarkdown(stack: Stack, items: StackItem[]): string {
  const ordered = stack.itemIds
    .map(id => items.find(i => i.id === id))
    .filter((i): i is StackItem => i != null);

  const parts: string[] = [
    `<!-- krumb:stack:${stack.id} -->`,
    `# ${stack.title}`,
    '',
  ];

  ordered.forEach((item, index) => {
    const headline = item.headline.trim() || `Item ${index + 1}`;
    parts.push(`<!-- krumb:item:${item.id} -->`);
    parts.push(`## ${headline}`, '');
    if (item.kind === 'verse') {
      parts.push(`> [${item.reference}](${item.url}) — ${item.verseText}`, '');
      const thought = item.thought.trim();
      if (thought) parts.push(thought, '');
    } else {
      const body = item.body.trim();
      if (body) parts.push(body, '');
    }
  });

  return parts.join('\n').trim() + '\n';
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
  /** Item ID extracted from the round-trip marker, if present. */
  sourceItemId?: string;
  headline: string;
  reference: string;
  url: string;
  verseText: string;
  thought: string;
}

export interface ParsedNoteItem {
  kind: 'note';
  /** Item ID extracted from the round-trip marker, if present. */
  sourceItemId?: string;
  headline: string;
  body: string;
}

export type ParsedStackItem = ParsedVerseItem | ParsedNoteItem;

export interface ParsedStack {
  /** Stack ID extracted from the round-trip marker, if present. */
  sourceId?: string;
  title: string;
  items: ParsedStackItem[];
}

export class MarkdownParseError extends Error {}

/**
 * Parse markdown back into a stack shape. Accepts both Krumb-emitted markdown
 * (with markers) and lightly-edited Bear notes that follow the same shape.
 *
 * Required:
 *  - At least one `# Title` line.
 *
 * Optional:
 *  - `<!-- krumb:stack:{id} -->` for stack-level identity.
 *  - `<!-- krumb:item:{id} -->` for per-item identity (used by the diff
 *    preview and to preserve `createdAt` across a round-trip).
 */
export function markdownToStack(md: string): ParsedStack {
  if (!md || !md.trim()) {
    throw new MarkdownParseError('Clipboard is empty.');
  }

  const sourceId = STACK_MARKER_RE.exec(md)?.[1];

  const titleMatch = md.match(/^#\s+(.+)$/m);
  if (!titleMatch) {
    throw new MarkdownParseError(
      'No title found. The first heading must be `# Stack title`.'
    );
  }
  const title = titleMatch[1].trim();

  const afterTitle = md.slice((titleMatch.index ?? 0) + titleMatch[0].length);

  // Split by `## ` headings — those are item boundaries.
  const sectionMatches = Array.from(afterTitle.matchAll(/^##\s+(.+)$/gm));

  const items: ParsedStackItem[] = [];

  for (let i = 0; i < sectionMatches.length; i += 1) {
    const m = sectionMatches[i];
    const sectionStart = (m.index ?? 0) + m[0].length;
    const sectionEnd =
      i + 1 < sectionMatches.length
        ? (sectionMatches[i + 1].index ?? afterTitle.length)
        : afterTitle.length;

    const rawHeading = m[1].trim();
    const headline = stripDecorativeNumber(rawHeading);

    // The item ID marker, if present, must appear before this heading and
    // after the previous heading (or after the title, for the first item).
    const beforeStart = m.index ?? 0;
    const beforeEnd =
      i === 0
        ? 0
        : (sectionMatches[i - 1].index ?? 0) + sectionMatches[i - 1][0].length;
    const between = afterTitle.slice(beforeEnd, beforeStart);
    const sourceItemId = ITEM_MARKER_RE.exec(between)?.[1];

    const sectionBody = afterTitle.slice(sectionStart, sectionEnd).trim();
    if (!sectionBody && !headline) continue;

    items.push(parseSection(headline, sectionBody, sourceItemId));
  }

  return {sourceId, title, items};
}

/** Strip a leading "1. " / "12. " etc. — the export emits these decoratively. */
function stripDecorativeNumber(s: string): string {
  return s.replace(/^\d+\.\s+/, '').trim();
}

function parseSection(
  headline: string,
  body: string,
  sourceItemId: string | undefined
): ParsedStackItem {
  const firstNonEmpty = body.split('\n').find(l => l.trim().length > 0) ?? '';
  const verseMatch = VERSE_LINE_RE.exec(firstNonEmpty.trim());

  if (verseMatch) {
    const [, reference, url, text] = verseMatch;
    // Anything after the blockquote line is the user's thought.
    const lines = body.split('\n');
    const verseLineIdx = lines.findIndex(
      l => l.trim() === firstNonEmpty.trim()
    );
    const thought = lines
      .slice(verseLineIdx + 1)
      .join('\n')
      .trim();

    return {
      kind: 'verse',
      sourceItemId,
      headline: headline || reference.trim(),
      reference: reference.trim(),
      url: url.trim(),
      verseText: text.trim(),
      thought,
    };
  }

  // Note item: everything in the section is body.
  return {
    kind: 'note',
    sourceItemId,
    headline: headline || firstLine(body) || 'Note',
    body,
  };
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

export interface ItemDiffEntry {
  status: 'unchanged' | 'changed' | 'added' | 'removed';
  headline: string;
  /** Present for unchanged / changed / added — the item from the markdown. */
  parsed?: ParsedStackItem;
  /** Present for unchanged / changed / removed — the existing local item. */
  existing?: StackItem;
}

export interface ImportPreview {
  action: 'create' | 'update';
  /**
   * Stack ID that will be written to. Either the existing stack's ID, the
   * source ID from the markdown, or a freshly-generated one.
   */
  targetStackId: string;
  /** Title from the markdown. */
  title: string;
  /** Existing stack, if this is an update. */
  existingTitle?: string;
  parsed: ParsedStack;
  diff: ItemDiffEntry[];
}

/**
 * Compute a preview of what an import would do without actually applying it.
 * Pure — relies on a snapshot of stacks + items passed in by the caller.
 */
export function computeImportPreview(
  parsed: ParsedStack,
  stacks: ReadonlyArray<Stack>,
  items: ReadonlyArray<StackItem>,
  generateId: () => string
): ImportPreview {
  const existing = parsed.sourceId
    ? stacks.find(s => s.id === parsed.sourceId)
    : undefined;
  const targetStackId = existing?.id ?? parsed.sourceId ?? generateId();
  const action: 'create' | 'update' = existing ? 'update' : 'create';

  if (!existing) {
    const diff: ItemDiffEntry[] = parsed.items.map(p => ({
      status: 'added',
      headline: p.headline,
      parsed: p,
    }));
    return {action, targetStackId, title: parsed.title, parsed, diff};
  }

  const existingItems = existing.itemIds
    .map(id => items.find(i => i.id === id))
    .filter((i): i is StackItem => i != null);

  const matchedExistingIds = new Set<string>();
  const diff: ItemDiffEntry[] = [];

  for (const p of parsed.items) {
    const match = p.sourceItemId
      ? existingItems.find(i => i.id === p.sourceItemId)
      : undefined;
    if (match) {
      matchedExistingIds.add(match.id);
      diff.push({
        status: itemsEqual(p, match) ? 'unchanged' : 'changed',
        headline: p.headline,
        parsed: p,
        existing: match,
      });
    } else {
      diff.push({status: 'added', headline: p.headline, parsed: p});
    }
  }

  for (const ex of existingItems) {
    if (!matchedExistingIds.has(ex.id)) {
      diff.push({
        status: 'removed',
        headline: ex.headline || itemFallbackLabel(ex),
        existing: ex,
      });
    }
  }

  return {
    action,
    targetStackId,
    title: parsed.title,
    existingTitle: existing.title,
    parsed,
    diff,
  };
}

function itemsEqual(parsed: ParsedStackItem, existing: StackItem): boolean {
  if (parsed.headline.trim() !== existing.headline.trim()) return false;
  if (parsed.kind === 'verse' && existing.kind === 'verse') {
    return (
      parsed.reference.trim() === existing.reference.trim() &&
      parsed.url.trim() === existing.url.trim() &&
      parsed.verseText.trim() === existing.verseText.trim() &&
      parsed.thought.trim() === existing.thought.trim()
    );
  }
  if (parsed.kind === 'note' && existing.kind === 'note') {
    return parsed.body.trim() === existing.body.trim();
  }
  return false;
}

function itemFallbackLabel(item: StackItem): string {
  if (item.kind === 'verse') return item.reference;
  return firstLine(item.body) || 'Note';
}
