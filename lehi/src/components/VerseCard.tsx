import * as Clipboard from 'expo-clipboard';
import {Copy, ExternalLink, Plus} from 'lucide-react-native';
import {useColorScheme} from 'nativewind';
import React from 'react';
import {Linking, Text, View} from 'react-native';

import {AnimatedPressable} from '@/components/AnimatedPressable';
import {HighlightedText} from '@/components/HighlightedText';
import {hapticLight, hapticSuccess} from '@/lib/haptics';
import {
  buildMarkdownBlockquote,
  buildPlainCopy,
  buildVerseUrl,
} from '@/lib/scripture';
import {toast} from '@/lib/toast';
import type {Verse} from '@/lib/types';

interface Props {
  verse: Verse;
  query?: string;
  onAdd?: () => void;
}

export const VerseCard: React.FC<Props> = ({verse, query = '', onAdd}) => {
  const {colorScheme} = useColorScheme();
  const isDark = colorScheme === 'dark';

  const onCopyMarkdown = async () => {
    hapticSuccess();
    await Clipboard.setStringAsync(buildMarkdownBlockquote(verse));
    toast({title: 'Markdown copied', preset: 'done'});
  };

  const onCopyPlain = async () => {
    hapticSuccess();
    await Clipboard.setStringAsync(buildPlainCopy(verse));
    toast({title: 'Copied', preset: 'done'});
  };

  const onOpen = () => {
    hapticLight();
    Linking.openURL(buildVerseUrl(verse)).catch(() => {});
  };

  const onAddPress = () => {
    if (!onAdd) return;
    hapticSuccess();
    onAdd();
  };

  return (
    <View className="mx-4 mb-3 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 overflow-hidden">
      <AnimatedPressable
        onPress={onCopyMarkdown}
        accessibilityLabel={`Copy ${verse.reference} as markdown`}
      >
        <View className="px-4 pt-4">
          <Text className="text-sm font-semibold text-brand-600 dark:text-brand-400 mb-1.5">
            {verse.reference}
          </Text>
          <HighlightedText
            text={verse.text}
            query={query}
            baseClassName="text-base leading-6 text-neutral-900 dark:text-neutral-100"
          />
        </View>
      </AnimatedPressable>

      <View className="flex-row items-stretch px-3 pb-3 pt-3 gap-2">
        <AnimatedPressable
          onPress={onCopyPlain}
          className="flex-1 flex-row items-center justify-center bg-neutral-100 dark:bg-neutral-900 rounded-xl py-2.5 gap-1.5"
          accessibilityLabel="Copy plain"
        >
          <Copy size={16} color={isDark ? '#fcd34d' : '#b45309'} />
          <Text className="text-sm font-semibold text-brand-700 dark:text-brand-300">
            Copy
          </Text>
        </AnimatedPressable>
        <AnimatedPressable
          onPress={onOpen}
          className="flex-1 flex-row items-center justify-center bg-neutral-100 dark:bg-neutral-900 rounded-xl py-2.5 gap-1.5"
          accessibilityLabel="Open in Gospel Library"
        >
          <ExternalLink size={16} color={isDark ? '#fcd34d' : '#b45309'} />
          <Text className="text-sm font-semibold text-brand-700 dark:text-brand-300">
            Open
          </Text>
        </AnimatedPressable>
        {onAdd && (
          <AnimatedPressable
            onPress={onAddPress}
            className="flex-1 flex-row items-center justify-center bg-brand-500 rounded-xl py-2.5 gap-1.5"
            accessibilityLabel="Add to stack"
          >
            <Plus size={16} color="#fff" />
            <Text className="text-sm font-semibold text-white">Add</Text>
          </AnimatedPressable>
        )}
      </View>
    </View>
  );
};
