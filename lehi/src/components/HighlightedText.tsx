import React from 'react';
import {Text, type TextStyle} from 'react-native';

interface Props {
  text: string;
  query: string;
  baseClassName?: string;
  highlightClassName?: string;
  style?: TextStyle;
}

/**
 * Splits `text` on case-insensitive occurrences of `query` and renders
 * the matches with a highlight style. Used in the verse search results
 * to show what the user matched.
 */
export const HighlightedText: React.FC<Props> = ({
  text,
  query,
  baseClassName = '',
  highlightClassName = 'bg-brand-200 dark:bg-brand-700/60 text-neutral-900 dark:text-white',
  style,
}) => {
  const trimmed = query.trim();
  if (trimmed.length < 3) {
    return (
      <Text className={baseClassName} style={style}>
        {text}
      </Text>
    );
  }

  const parts: React.ReactNode[] = [];
  const re = new RegExp(escapeRegex(trimmed), 'gi');
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Text key={`p-${key++}`} className={baseClassName} style={style}>
          {text.slice(lastIndex, match.index)}
        </Text>
      );
    }
    parts.push(
      <Text key={`h-${key++}`} className={highlightClassName} style={style}>
        {match[0]}
      </Text>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <Text key={`p-${key++}`} className={baseClassName} style={style}>
        {text.slice(lastIndex)}
      </Text>
    );
  }

  return (
    <Text className={baseClassName} style={style}>
      {parts}
    </Text>
  );
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
