import {useLocalSearchParams, useRouter} from 'expo-router';
import {Check, Plus} from 'lucide-react-native';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {FlatList, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {AnimatedPressable} from '@/components/AnimatedPressable';
import {ScreenHeader} from '@/components/ScreenHeader';
import {formatAnnotation, getAnnotation} from '@/lib/annotations';
import {hapticLight, hapticSelection} from '@/lib/haptics';
import {chapterTitleFromReference, getChapterVerses} from '@/lib/scripture';
import type {Verse} from '@/lib/types';
import {useStacksStore} from '@/store/useStacksStore';

export default function VerseContextScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    work: string;
    book?: string;
    chapter: string;
    verse: string;
  }>();
  const setPendingVerses = useStacksStore((s) => s.setPendingVerses);

  const chapterNum = parseInt(params.chapter ?? '0', 10);
  const targetVerseNum = parseInt(params.verse ?? '0', 10);

  const verses = useMemo(
    () =>
      getChapterVerses(
        params.work ?? '',
        params.book?.length ? params.book : undefined,
        chapterNum
      ),
    [params.work, params.book, chapterNum]
  );

  const chapterTitle = useMemo(() => {
    const first = verses[0];
    return first ? chapterTitleFromReference(first.reference) : '';
  }, [verses]);

  const annotation = useMemo(
    () =>
      getAnnotation({
        standardWorkSlug: params.work ?? '',
        bookSlug: params.book?.length ? params.book : undefined,
        chapter: chapterNum,
      }),
    [params.work, params.book, chapterNum]
  );

  const [selected, setSelected] = useState<Set<string>>(() => {
    const target = verses.find((v) => v.verse === targetVerseNum);
    return new Set(target ? [keyOf(target)] : []);
  });

  const listRef = useRef<FlatList<Verse>>(null);

  useEffect(() => {
    // Scroll the originally tapped verse into view once layout is ready.
    if (verses.length === 0) return;
    const idx = verses.findIndex((v) => v.verse === targetVerseNum);
    if (idx <= 0) return;
    const t = setTimeout(() => {
      listRef.current?.scrollToIndex({index: idx, animated: false, viewPosition: 0.2});
    }, 50);
    return () => clearTimeout(t);
  }, [verses, targetVerseNum]);

  const onToggle = (v: Verse) => {
    hapticSelection();
    setSelected((prev) => {
      const next = new Set(prev);
      const k = keyOf(v);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const onAdd = () => {
    const picked = verses.filter((v) => selected.has(keyOf(v)));
    if (picked.length === 0) return;
    hapticLight();
    setPendingVerses(picked);
    router.push('/stack-picker');
  };

  const selectedCount = selected.size;

  if (verses.length === 0) {
    return (
      <SafeAreaView
        edges={['top']}
        className="flex-1 bg-neutral-50 dark:bg-neutral-900"
      >
        <ScreenHeader title="Verse not found" leading="back" />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-base text-neutral-500 dark:text-neutral-400 text-center">
            Couldn&apos;t load this chapter.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top']}
      className="flex-1 bg-neutral-50 dark:bg-neutral-900"
    >
      <ScreenHeader title={chapterTitle} leading="back" />

      {annotation ? (
        <View className="px-4 pb-2">
          <Text className="text-sm leading-5 text-neutral-500 dark:text-neutral-400">
            {formatAnnotation(annotation)}
          </Text>
        </View>
      ) : null}

      <FlatList
        ref={listRef}
        data={verses}
        keyExtractor={keyOf}
        contentContainerStyle={{paddingBottom: 120, paddingTop: 4}}
        onScrollToIndexFailed={(info) => {
          // Retry after layout once the list catches up.
          setTimeout(() => {
            listRef.current?.scrollToIndex({
              index: info.index,
              animated: false,
              viewPosition: 0.2,
            });
          }, 100);
        }}
        renderItem={({item}) => {
          const k = keyOf(item);
          const isSelected = selected.has(k);
          const isTarget = item.verse === targetVerseNum;
          return (
            <AnimatedPressable
              onPress={() => onToggle(item)}
              accessibilityLabel={`${
                isSelected ? 'Deselect' : 'Select'
              } verse ${item.verse}`}
              className={`mx-4 mb-2 rounded-2xl border overflow-hidden ${
                isSelected
                  ? 'bg-brand-50 dark:bg-brand-900/30 border-brand-300 dark:border-brand-700'
                  : isTarget
                    ? 'bg-white dark:bg-neutral-800 border-brand-200 dark:border-brand-800'
                    : 'bg-white dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700'
              }`}
            >
              <View className="px-4 py-3 flex-row">
                <View
                  className={`w-7 h-7 rounded-full items-center justify-center mr-3 mt-0.5 ${
                    isSelected
                      ? 'bg-brand-500'
                      : 'bg-neutral-100 dark:bg-neutral-900'
                  }`}
                >
                  {isSelected ? (
                    <Check size={14} color="#fff" />
                  ) : (
                    <Text
                      className={`text-xs font-bold ${
                        isTarget
                          ? 'text-brand-700 dark:text-brand-300'
                          : 'text-neutral-500 dark:text-neutral-400'
                      }`}
                    >
                      {item.verse}
                    </Text>
                  )}
                </View>
                <Text
                  className={`flex-1 text-base leading-6 ${
                    isSelected
                      ? 'text-neutral-900 dark:text-white'
                      : 'text-neutral-800 dark:text-neutral-100'
                  }`}
                >
                  {item.text}
                </Text>
              </View>
            </AnimatedPressable>
          );
        }}
      />

      {selectedCount > 0 && (
        <View
          className="absolute left-0 right-0 bottom-0 px-4 pb-6 pt-3 bg-neutral-50/95 dark:bg-neutral-900/95 border-t border-neutral-200 dark:border-neutral-800"
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 12,
            shadowOffset: {width: 0, height: -4},
            elevation: 10,
          }}
        >
          <AnimatedPressable
            onPress={onAdd}
            className="flex-row items-center justify-center bg-brand-500 rounded-2xl h-12 gap-2"
            accessibilityLabel={`Add ${selectedCount} to stack`}
          >
            <Plus size={18} color="#fff" />
            <Text className="text-white font-semibold text-base">
              Add {selectedCount} verse{selectedCount === 1 ? '' : 's'} to stack
            </Text>
          </AnimatedPressable>
          <Text className="text-xs text-neutral-500 dark:text-neutral-400 text-center mt-2">
            Tap verses to add or remove from selection
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function keyOf(v: Verse): string {
  return `${v.standardWorkSlug}-${v.reference}`;
}
