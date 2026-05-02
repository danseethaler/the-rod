import {useScrollToTop} from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import {useRouter} from 'expo-router';
import {ClipboardPaste, Layers, Plus} from 'lucide-react-native';
import {useColorScheme} from 'nativewind';
import React, {useRef} from 'react';
import {FlatList, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {AnimatedListItem} from '@/components/AnimatedListItem';
import {AnimatedPressable} from '@/components/AnimatedPressable';
import {hapticError, hapticLight} from '@/lib/haptics';
import {MarkdownParseError} from '@/lib/markdown';
import {toast} from '@/lib/toast';
import {STACK_STATUS_LABEL, type Stack} from '@/lib/types';
import {useStacksStore} from '@/store/useStacksStore';

export default function StacksScreen() {
  const router = useRouter();
  const {colorScheme} = useColorScheme();
  const isDark = colorScheme === 'dark';
  const stacks = useStacksStore(s => s.stacks);
  const previewImport = useStacksStore(s => s.previewImport);
  const setPendingImport = useStacksStore(s => s.setPendingImport);

  const listRef = useRef<FlatList<Stack>>(null);
  useScrollToTop(listRef);

  const onAdd = () => {
    hapticLight();
    router.push('/stack/new');
  };

  const onImport = async () => {
    hapticLight();
    const md = await Clipboard.getStringAsync();
    if (!md.trim()) {
      hapticError();
      toast({title: 'Clipboard is empty', preset: 'error'});
      return;
    }
    try {
      const preview = previewImport(md);
      setPendingImport(preview);
      router.push({pathname: '/import-preview' as never});
    } catch (err) {
      hapticError();
      toast({
        title:
          err instanceof MarkdownParseError
            ? err.message
            : 'Could not parse markdown',
        preset: 'error',
      });
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      className="flex-1 bg-neutral-50 dark:bg-neutral-900"
    >
      <View className="flex-row items-center px-5 pt-2 pb-3">
        <View className="flex-1">
          <Text className="text-3xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            Stacks
          </Text>
          <Text className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Drafts in progress. Bake until done.
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <AnimatedPressable
            onPress={onImport}
            className="w-11 h-11 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800"
            accessibilityLabel="Import from clipboard"
          >
            <ClipboardPaste size={20} color={isDark ? '#fbbf24' : '#b45309'} />
          </AnimatedPressable>
          <AnimatedPressable
            onPress={onAdd}
            className="w-11 h-11 items-center justify-center bg-brand-500 rounded-full"
            accessibilityLabel="New stack"
          >
            <Plus size={22} color="#fff" />
          </AnimatedPressable>
        </View>
      </View>

      {stacks.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8 -mt-12">
          <View className="w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-900/40 items-center justify-center mb-4">
            <Layers size={28} color={isDark ? '#fbbf24' : '#b45309'} />
          </View>
          <Text className="text-xl font-semibold text-neutral-900 dark:text-white text-center">
            No stacks yet
          </Text>
          <Text className="text-base text-neutral-500 dark:text-neutral-400 mt-2 text-center leading-6">
            A stack is a draft talk in motion. Start one, then drop verses and
            notes into it as you ponder.
          </Text>
          <AnimatedPressable
            onPress={onAdd}
            className="mt-6 bg-brand-500 rounded-2xl px-5 h-12 items-center justify-center"
          >
            <Text className="text-white font-semibold">New stack</Text>
          </AnimatedPressable>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={stacks}
          keyExtractor={s => s.id}
          contentContainerStyle={{paddingBottom: 24, paddingHorizontal: 16}}
          renderItem={({item, index}) => (
            <AnimatedListItem index={index}>
              <StackRow stack={item} />
            </AnimatedListItem>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function StackRow({stack}: {stack: Stack}) {
  const router = useRouter();
  const sections = useStacksStore(s => s.sections);
  const itemCount = (stack.sectionIds ?? []).reduce((acc, sid) => {
    const section = sections.find(s => s.id === sid);
    return acc + (section?.itemIds.length ?? 0);
  }, 0);
  const onPress = () => {
    hapticLight();
    router.push({pathname: '/stack/[id]', params: {id: stack.id}});
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 mb-3 px-4 py-4"
    >
      <View className="flex-row items-center justify-between mb-1.5">
        <Text
          className="text-base font-semibold text-neutral-900 dark:text-white flex-1 mr-2"
          numberOfLines={1}
        >
          {stack.title}
        </Text>
        <StatusPill status={stack.status} />
      </View>
      <Text className="text-sm text-neutral-500 dark:text-neutral-400">
        {itemCount === 0
          ? 'Empty — start brainstorming'
          : `${itemCount} item${itemCount === 1 ? '' : 's'}`}
      </Text>
    </AnimatedPressable>
  );
}

function StatusPill({status}: {status: Stack['status']}) {
  const bg =
    status === 'done'
      ? 'bg-green-50 dark:bg-green-900/30'
      : status === 'archived'
        ? 'bg-neutral-100 dark:bg-neutral-700'
        : 'bg-brand-50 dark:bg-brand-900/40';
  const fg =
    status === 'done'
      ? 'text-green-700 dark:text-green-300'
      : status === 'archived'
        ? 'text-neutral-500 dark:text-neutral-400'
        : 'text-brand-700 dark:text-brand-300';

  return (
    <View className={`px-2 py-0.5 rounded-full ${bg}`}>
      <Text className={`text-xs font-semibold ${fg}`}>
        {STACK_STATUS_LABEL[status]}
      </Text>
    </View>
  );
}
