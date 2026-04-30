import {useScrollToTop} from '@react-navigation/native';
import {X} from 'lucide-react-native';
import {useColorScheme} from 'nativewind';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {FlatList, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {AnimatedPressable} from '@/components/AnimatedPressable';
import {RodKeyboardAvoidingView} from '@/components/RodKeyboardAvoidingView';
import {VerseCard} from '@/components/VerseCard';
import {hapticLight} from '@/lib/haptics';
import {searchVerses} from '@/lib/scripture';
import type {Verse} from '@/lib/types';

export default function SearchScreen() {
  const {colorScheme} = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList<Verse>>(null);
  useScrollToTop(listRef);

  const result = useMemo(() => searchVerses(query), [query]);

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
          The soft middle of the word.
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
          {query.trim().length >= 3 && (
            <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 text-right">
              {result.total.toLocaleString()} result
              {result.total === 1 ? '' : 's'} · {result.durationMs}ms
              {result.total > result.verses.length
                ? ` · showing ${result.verses.length}`
                : ''}
            </Text>
          )}
        </View>

        {query.trim().length < 3 ? (
          <View className="flex-1 items-center justify-center px-8 -mt-12">
            <Text className="text-xl font-semibold text-neutral-900 dark:text-white text-center">
              The word of God
            </Text>
            <Text className="text-base text-neutral-500 dark:text-neutral-400 mt-2 text-center leading-6">
              Type a phrase to search every verse in the Standard Works.
              Tap a verse to copy as a markdown blockquote.
            </Text>
          </View>
        ) : result.verses.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8 -mt-12">
            <Text className="text-xl font-semibold text-neutral-900 dark:text-white text-center">
              No matches
            </Text>
            <Text className="text-base text-neutral-500 dark:text-neutral-400 mt-2 text-center">
              Try a shorter or different phrase.
            </Text>
          </View>
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
