import type {Stack, StackItem} from '@/lib/types';

/**
 * Render a stack to Bear-friendly markdown. Used by the Export action and the
 * "Send to Bear" deep link. Output mirrors Dan's existing talk template:
 * # Title, then each item as a numbered section.
 */
export function stackToMarkdown(stack: Stack, items: StackItem[]): string {
  const ordered = stack.itemIds
    .map((id) => items.find((i) => i.id === id))
    .filter((i): i is StackItem => i != null);

  const parts: string[] = [`# ${stack.title}`, ''];

  ordered.forEach((item, index) => {
    if (item.kind === 'verse') {
      parts.push(`## ${index + 1}. ${item.reference}`, '');
      parts.push(`> [${item.reference}](${item.url}) — ${item.text}`, '');
    } else {
      const head = item.body.split('\n')[0]?.trim() || `Note ${index + 1}`;
      parts.push(`## ${index + 1}. ${head}`, '');
      parts.push(item.body, '');
    }
    if (item.thought.trim()) {
      parts.push(item.thought.trim(), '');
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
