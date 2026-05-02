import {useScrollToTop} from '@react-navigation/native';
import {Search, X} from 'lucide-react-native';
import {useColorScheme} from 'nativewind';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  FlatList,
  Keyboard,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {AnimatedPressable} from '@/components/AnimatedPressable';
import {RodKeyboardAvoidingView} from '@/components/RodKeyboardAvoidingView';
import {VerseCard} from '@/components/VerseCard';
import {hapticLight, hapticSelection} from '@/lib/haptics';
import {searchVerses} from '@/lib/scripture';
import type {Verse} from '@/lib/types';

const EXAMPLE_QUERIES = [
  'be of good cheer',
  'feast upon',
  'endure to the end',
  'rod of iron',
  'be still',
  'remember',
  'covenant',
  'prepare ye',
];

export default function SearchScreen() {
  const {colorScheme} = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList<Verse>>(null);
  useScrollToTop(listRef);

  const result = useMemo(() => searchVerses(query), [query]);
  const trimmedLength = query.trim().length;
  const isTooShort = trimmedLength > 0 && trimmedLength < 3;

  useEffect(() => {
    // Soft autofocus on first paint.
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, []);

  const onClear = () => {
    hapticLight();
    setQuery('');
    inputRef.current?.focus();
  };

  const onPickExample = (phrase: string) => {
    hapticSelection();
    setQuery(phrase);
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      className="flex-1 bg-neutral-50 dark:bg-neutral-900"
    >
      <View className="px-4 pt-2 pb-3">
        <Text className="text-3xl font-semibold text-neutral-900 dark:text-white tracking-tight">
          Krumb
        </Text>
        <Text className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
          Search the Standard Works.
        </Text>
      </View>

      <RodKeyboardAvoidingView keyboardVerticalOffset={0}>
        <View className="px-4 pb-3">
          <View className="flex-row items-center bg-neutral-100 dark:bg-neutral-800 rounded-xl">
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder="O be wise…"
              placeholderTextColor={isDark ? '#737373' : '#a3a3a3'}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              keyboardAppearance={isDark ? 'dark' : 'light'}
              className="flex-1 px-4 py-3 text-base text-neutral-900 dark:text-white"
            />
            {query.length > 0 && (
              <AnimatedPressable
                onPress={onClear}
                className="px-3 py-3"
                accessibilityLabel="Clear search"
              >
                <X size={18} color={isDark ? '#a3a3a3' : '#737373'} />
              </AnimatedPressable>
            )}
          </View>
          {isTooShort ? (
            <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 text-right">
              Type at least 3 characters
            </Text>
          ) : trimmedLength >= 3 ? (
            <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 text-right">
              {result.total.toLocaleString()} result
              {result.total === 1 ? '' : 's'} · {result.durationMs}ms
              {result.total > result.verses.length
                ? ` · showing ${result.verses.length}`
                : ''}
            </Text>
          ) : null}
        </View>

        {trimmedLength < 3 ? (
          <Pressable
            onPress={() => Keyboard.dismiss()}
            className="flex-1"
            accessible={false}
          >
            <View className="px-6 pt-6">
              <Text className="text-xl font-semibold text-neutral-900 dark:text-white">
                The word of God
              </Text>
              <Text className="text-base text-neutral-500 dark:text-neutral-400 mt-2 leading-6">
                Type a phrase to search every verse in the Standard Works.
                Tap a verse to read it in context.
              </Text>

              <Text className="text-xs uppercase tracking-wider font-semibold text-brand-700 dark:text-brand-300 mt-8 mb-3">
                Try a phrase
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {EXAMPLE_QUERIES.map((phrase) => (
                  <AnimatedPressable
                    key={phrase}
                    onPress={() => onPickExample(phrase)}
                    className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-full px-3 py-2 flex-row items-center gap-1.5"
                    accessibilityLabel={`Search for ${phrase}`}
                  >
                    <Search
                      size={12}
                      color={isDark ? '#fbbf24' : '#b45309'}
                    />
                    <Text className="text-sm text-neutral-800 dark:text-neutral-100">
                      {phrase}
                    </Text>
                  </AnimatedPressable>
                ))}
              </View>
            </View>
          </Pressable>
        ) : result.verses.length === 0 ? (
          <Pressable
            onPress={() => Keyboard.dismiss()}
            className="flex-1"
            accessible={false}
          >
            <View className="flex-1 items-center justify-center px-8 -mt-12">
              <Text className="text-xl font-semibold text-neutral-900 dark:text-white text-center">
                No matches
              </Text>
              <Text className="text-base text-neutral-500 dark:text-neutral-400 mt-2 text-center leading-6">
                Krumb matches your phrase exactly, anywhere in a verse — no
                fuzzy matching, no synonyms. Try fewer words, a shorter
                fragment, or a different turn of phrase.
              </Text>
            </View>
          </Pressable>
        ) : (
          <FlatList
            ref={listRef}
            data={result.verses}
            keyExtractor={(v) => `${v.standardWorkSlug}-${v.reference}`}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{paddingBottom: 24}}
            renderItem={({item}) => <VerseCard verse={item} query={query} />}
          />
        )}
      </RodKeyboardAvoidingView>
    </SafeAreaView>
  );
}
