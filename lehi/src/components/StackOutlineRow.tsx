import {FileText, Pencil, Quote} from 'lucide-react-native';
import {useColorScheme} from 'nativewind';
import React from 'react';
import {Text, View} from 'react-native';

import {AnimatedPressable} from '@/components/AnimatedPressable';
import {VerseTextPreview} from '@/components/VerseTextPreview';
import {parseVerseMarkdown} from '@/lib/verseFormat';
import type {StackItem} from '@/lib/types';

interface Props {
  item: StackItem;
  onPress: () => void;
}

/**
 * Collapsed outline row in the stack detail screen. Shows a tight summary —
 * kind glyph, headline, short excerpt with word count, and a small pencil
 * dot when a verse item has a thought attached. The whole row is one tap
 * target; long-press is owned by the surrounding `Sortable.Flex` for
 * drag-to-reorder.
 */
export const StackOutlineRow = React.memo(function StackOutlineRow({
  item,
  onPress,
}: Props) {
  const {colorScheme} = useColorScheme();
  const isDark = colorScheme === 'dark';

  const wordCount = useWordCount(item);
  const hasThought = item.kind === 'verse' && item.thought.trim().length > 0;
  const verseMarkdown =
    item.kind === 'verse' ? item.verses.map(v => v.text).join(' ') : '';

  return (
    <AnimatedPressable
      onPress={onPress}
      className="flex-row items-start gap-3 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 px-4 py-3"
    >
      <View className="w-9 h-9 rounded-full bg-brand-50 dark:bg-brand-900/40 items-center justify-center mt-0.5">
        {item.kind === 'verse' ? (
          <Quote size={18} color={isDark ? '#fbbf24' : '#b45309'} />
        ) : (
          <FileText size={18} color={isDark ? '#fbbf24' : '#b45309'} />
        )}
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text
            className="flex-1 text-base font-semibold text-neutral-900 dark:text-white"
            numberOfLines={1}
          >
            {item.headline || untitledLabel(item)}
          </Text>
          {hasThought && (
            <Pencil
              size={12}
              color={isDark ? '#fbbf24' : '#b45309'}
              accessibilityLabel="Has thought"
            />
          )}
        </View>
        <View className="mt-0.5">
          {item.kind === 'verse' ? (
            <VerseTextPreview markdown={verseMarkdown} />
          ) : (
            <Text
              className="text-sm text-neutral-500 dark:text-neutral-400"
              numberOfLines={2}
            >
              {item.body.replace(/\s+/g, ' ').trim()}
            </Text>
          )}
        </View>
        <Text className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
          {wordCount} word{wordCount === 1 ? '' : 's'}
        </Text>
      </View>
    </AnimatedPressable>
  );
});

function useWordCount(item: StackItem): number {
  if (item.kind === 'verse') {
    // Use parser display so we count post-format-strip text, not raw markers.
    const joined = item.verses
      .map(v => parseVerseMarkdown(v.text).display)
      .join(' ');
    return countWordsPlain(joined);
  }
  return countWordsPlain(item.body);
}

function countWordsPlain(s: string): number {
  const trimmed = s.replace(/\s+/g, ' ').trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function untitledLabel(item: StackItem): string {
  return item.kind === 'verse' ? item.reference : 'Untitled note';
}
