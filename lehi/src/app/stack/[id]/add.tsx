import {useLocalSearchParams, useRouter} from 'expo-router';
import {Check, X} from 'lucide-react-native';
import {useColorScheme} from 'nativewind';
import React, {useEffect, useMemo, useRef, useState} from 'react';

import {FlatList, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {AnimatedPressable} from '@/components/AnimatedPressable';
import {HighlightedText} from '@/components/HighlightedText';
import {RodKeyboardAvoidingView} from '@/components/RodKeyboardAvoidingView';
import {ScreenHeader} from '@/components/ScreenHeader';
import {hapticLight, hapticSuccess} from '@/lib/haptics';
import {searchVerses} from '@/lib/scripture';
import {toast} from '@/lib/toast';
import type {Verse} from '@/lib/types';
import {
  resolveStackItems,
  selectStackById,
  useStacksStore,
} from '@/store/useStacksStore';

export default function AddVerseScreen() {
  const {id} = useLocalSearchParams<{id: string}>();
  const router = useRouter();
  const {colorScheme} = useColorScheme();
  const isDark = colorScheme === 'dark';

  const stack = useStacksStore(selectStackById(id));
  const allItems = useStacksStore((s) => s.items);
  const items = useMemo(
    () => resolveStackItems(stack, allItems),
    [stack, allItems]
  );
  const addVerseSetToStack = useStacksStore((s) => s.addVerseSetToStack);

  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);
  const result = useMemo(() => searchVerses(query), [query]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  /**
   * Index every individual verse already represented by any verse-set in
   * this stack. Keyed by `<work>|<book>|<chapter>:<verse>` so a single
   * verse won't be silently re-added when it's part of a larger set.
   */
  const alreadyAddedKeys = useMemo(() => {
    const out = new Set<string>();
    for (const i of items) {
      if (i.kind !== 'verse') continue;
      for (const v of i.verses) {
        out.add(
          `${i.standardWorkSlug}|${i.bookSlug ?? ''}|${i.chapter}:${v.verse}`
        );
      }
    }
    return out;
  }, [items]);

  const verseKey = (v: Verse) =>
    `${v.standardWorkSlug}|${v.bookSlug ?? ''}|${v.chapter}:${v.verse}`;

  const onAdd = (verse: Verse) => {
    if (!stack) return;
    hapticSuccess();
    addVerseSetToStack(stack.id, [verse]);
    toast({title: `Added ${verse.reference}`, preset: 'done'});
  };

  return (
    <SafeAreaView
      edges={['top']}
      className="flex-1 bg-neutral-50 dark:bg-neutral-900"
    >
      <ScreenHeader
        title="Add a verse"
        leading="close"
        onLeading={() => router.dismiss()}
      />
      <RodKeyboardAvoidingView keyboardVerticalOffset={0}>
        <View className="px-4 pb-3">
          <View className="flex-row items-center bg-neutral-100 dark:bg-neutral-800 rounded-xl">
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder="Search the Standard Works"
              placeholderTextColor={isDark ? '#737373' : '#a3a3a3'}
              autoCorrect={false}
              autoCapitalize="none"
              keyboardAppearance={isDark ? 'dark' : 'light'}
              className="flex-1 px-4 py-3 text-base text-neutral-900 dark:text-white"
            />
            {query.length > 0 && (
              <AnimatedPressable
                onPress={() => {
                  hapticLight();
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="px-3 py-3"
              >
                <X size={18} color={isDark ? '#a3a3a3' : '#737373'} />
              </AnimatedPressable>
            )}
          </View>
          {query.trim().length >= 3 && (
            <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 text-right">
              {result.total.toLocaleString()} match
              {result.total === 1 ? '' : 'es'}
            </Text>
          )}
        </View>

        {query.trim().length < 3 ? (
          <View className="flex-1 items-center justify-center px-8 -mt-12">
            <Text className="text-base text-neutral-500 dark:text-neutral-400 text-center leading-6">
              Type a phrase. Tap "Add" on any verse to drop it into{' '}
              <Text className="text-neutral-900 dark:text-white font-medium">
                {stack?.title}
              </Text>
              .
            </Text>
          </View>
        ) : (
          <FlatList
            data={result.verses}
            keyExtractor={(v) => `${v.standardWorkSlug}-${v.reference}`}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{paddingBottom: 24}}
            renderItem={({item}) => {
              const added = alreadyAddedKeys.has(verseKey(item));
              return (
                <View className="mx-4 mb-3 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 overflow-hidden">
                  <View className="px-4 pt-4">
                    <Text className="text-sm font-semibold text-brand-600 dark:text-brand-400 mb-1.5">
                      {item.reference}
                    </Text>
                    <HighlightedText
                      text={item.text}
                      query={query}
                      baseClassName="text-base leading-6 text-neutral-900 dark:text-neutral-100"
                    />
                  </View>
                  <View className="px-3 pb-3 pt-3">
                    <AnimatedPressable
                      onPress={() => onAdd(item)}
                      disabled={added}
                      className={`flex-row items-center justify-center rounded-xl py-2.5 gap-1.5 ${
                        added
                          ? 'bg-green-50 dark:bg-green-900/20'
                          : 'bg-brand-500'
                      }`}
                    >
                      {added ? (
                        <>
                          <Check size={16} color={isDark ? '#86efac' : '#16a34a'} />
                          <Text className="text-sm font-semibold text-green-700 dark:text-green-300">
                            Already in stack
                          </Text>
                        </>
                      ) : (
                        <Text className="text-sm font-semibold text-white">
                          Add to stack
                        </Text>
                      )}
                    </AnimatedPressable>
                  </View>
                </View>
              );
            }}
          />
        )}
      </RodKeyboardAvoidingView>
    </SafeAreaView>
  );
}
