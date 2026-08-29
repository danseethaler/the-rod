import * as Clipboard from 'expo-clipboard';
import {useRouter} from 'expo-router';
import {Copy, ExternalLink, Plus} from 'lucide-react-native';
import {useColorScheme} from 'nativewind';
import React from 'react';
import {Linking, Text, View} from 'react-native';

import {AnimatedPressable} from '@/components/AnimatedPressable';
import {HighlightedText} from '@/components/HighlightedText';
import {formatAnnotation, getAnnotation} from '@/lib/annotations';
import {hapticLight, hapticSuccess} from '@/lib/haptics';
import {
  buildMarkdownBlockquote,
  buildVerseUrl,
} from '@/lib/scripture';
import {toast} from '@/lib/toast';
import type {Verse} from '@/lib/types';
import {useStacksStore} from '@/store/useStacksStore';

interface Props {
  verse: Verse;
  query?: string;
}

export const VerseCard: React.FC<Props> = ({verse, query = ''}) => {
  const router = useRouter();
  const {colorScheme} = useColorScheme();
  const isDark = colorScheme === 'dark';
  const setPendingVerses = useStacksStore((s) => s.setPendingVerses);
  const annotation = getAnnotation(verse);

  const onDrillIn = () => {
    hapticLight();
    router.push({
      pathname: '/verse',
      params: {
        work: verse.standardWorkSlug,
        book: verse.bookSlug ?? '',
        chapter: String(verse.chapter),
        verse: String(verse.verse),
      },
    });
  };

  const onCopyMarkdown = async () => {
    hapticSuccess();
    await Clipboard.setStringAsync(buildMarkdownBlockquote(verse));
    toast({title: 'Markdown copied', preset: 'done'});
  };

  const onOpen = () => {
    hapticLight();
    Linking.openURL(buildVerseUrl(verse)).catch(() => {});
  };

  const onAdd = () => {
    hapticLight();
    setPendingVerses([verse]);
    router.push('/stack-picker');
  };

  return (
    <View className="mx-4 mb-3 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 overflow-hidden">
      <AnimatedPressable
        onPress={onDrillIn}
        accessibilityLabel={`Open ${verse.reference} in context`}
      >
        <View className="px-4 pt-4">
          <Text className="text-sm font-semibold text-brand-600 dark:text-brand-400">
            {verse.reference}
          </Text>
          {annotation ? (
            <Text
              className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 mb-1.5"
              numberOfLines={2}
            >
              {formatAnnotation(annotation)}
            </Text>
          ) : (
            <View className="mb-1.5" />
          )}
          <HighlightedText
            text={verse.text}
            query={query}
            baseClassName="text-base leading-6 text-neutral-900 dark:text-neutral-100"
          />
        </View>
      </AnimatedPressable>

      <View className="flex-row items-stretch px-3 pb-3 pt-3 gap-2">
        <AnimatedPressable
          onPress={onCopyMarkdown}
          className="flex-1 flex-row items-center justify-center bg-neutral-100 dark:bg-neutral-900 rounded-xl py-2.5 gap-1.5"
          accessibilityLabel="Copy as markdown"
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
        <AnimatedPressable
          onPress={onAdd}
          className="flex-1 flex-row items-center justify-center bg-brand-500 rounded-xl py-2.5 gap-1.5"
          accessibilityLabel="Add to stack"
        >
          <Plus size={16} color="#fff" />
          <Text className="text-sm font-semibold text-white">Add</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
};
