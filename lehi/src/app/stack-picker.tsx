import {useRouter} from 'expo-router';
import {Layers, Plus} from 'lucide-react-native';
import {useColorScheme} from 'nativewind';
import React, {useMemo, useRef, useState} from 'react';
import {FlatList, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {AnimatedPressable} from '@/components/AnimatedPressable';
import {RodKeyboardAvoidingView} from '@/components/RodKeyboardAvoidingView';
import {ScreenHeader} from '@/components/ScreenHeader';
import {hapticError, hapticLight, hapticSuccess} from '@/lib/haptics';
import {previewSetReference} from '@/lib/scripture';
import {toast} from '@/lib/toast';
import {STACK_STATUS_LABEL, type Stack, type Verse} from '@/lib/types';
import {useStacksStore} from '@/store/useStacksStore';

export default function StackPickerScreen() {
  const router = useRouter();
  const {colorScheme} = useColorScheme();
  const isDark = colorScheme === 'dark';

  const stacks = useStacksStore(s => s.stacks);
  const items = useStacksStore(s => s.items);
  const pendingVerses = useStacksStore(s => s.pendingVerses);
  const addVerseSetToStack = useStacksStore(s => s.addVerseSetToStack);
  const createStack = useStacksStore(s => s.createStack);
  const clearPendingVerses = useStacksStore(s => s.clearPendingVerses);

  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const titleInputRef = useRef<TextInput>(null);

  // Sort by most recently updated, dropping archived to the bottom.
  const sortedStacks = useMemo(() => {
    return [...stacks].sort((a, b) => {
      if (a.status === 'archived' && b.status !== 'archived') return 1;
      if (b.status === 'archived' && a.status !== 'archived') return -1;
      return b.updatedAt - a.updatedAt;
    });
  }, [stacks]);

  const verseCount = pendingVerses.length;

  const onClose = () => {
    clearPendingVerses();
    router.dismiss();
  };

  /**
   * Adds the pending verses as ONE grouped verse-set item. If a verse-set
   * with an identical reference already lives in the target stack, we
   * don't create a duplicate.
   */
  const addSetTo = (
    stackId: string
  ): {added: boolean; duplicateRef?: string} => {
    const item = addVerseSetToStack(stackId, pendingVerses);
    // Check whether an existing item already represents the same set —
    // we look at the reference string we just computed.
    const duplicate = items
      .filter(
        i => i.stackId === stackId && i.kind === 'verse' && i.id !== item.id
      )
      .find(i => i.kind === 'verse' && i.reference === item.reference);
    if (duplicate) {
      // Roll back: remove the just-added duplicate. Calling removeItem keeps
      // ordering / persistence consistent.
      useStacksStore.getState().removeItem(item.id);
      return {added: false, duplicateRef: item.reference};
    }
    return {added: true};
  };

  const finishWithToast = (
    stackTitle: string,
    added: boolean,
    duplicateRef: string | undefined,
    setReference: string,
    verseCountInSet: number
  ) => {
    if (!added && duplicateRef) {
      hapticError();
      toast({title: `${duplicateRef} already in stack`, preset: 'error'});
      return;
    }
    hapticSuccess();
    const label =
      verseCountInSet === 1
        ? setReference
        : `${setReference} (${verseCountInSet} verses)`;
    toast({title: `Added ${label} to ${stackTitle}`, preset: 'done'});
  };

  const onPickStack = (stack: Stack) => {
    if (verseCount === 0) return;
    // Snapshot the set reference BEFORE we add (so the toast still has it
    // after addSetTo potentially rolls back).
    const previewRef = previewSetReference(pendingVerses);
    const {added, duplicateRef} = addSetTo(stack.id);
    finishWithToast(stack.title, added, duplicateRef, previewRef, verseCount);
    clearPendingVerses();
    router.dismiss();
  };

  const onStartCreate = () => {
    hapticLight();
    setCreating(true);
    setTimeout(() => titleInputRef.current?.focus(), 50);
  };

  const onCancelCreate = () => {
    hapticLight();
    setCreating(false);
    setNewTitle('');
  };

  const onConfirmCreate = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) {
      hapticError();
      return;
    }
    if (verseCount === 0) {
      onClose();
      return;
    }
    const previewRef = previewSetReference(pendingVerses);
    const stack = createStack(trimmed);
    const {added, duplicateRef} = addSetTo(stack.id);
    finishWithToast(stack.title, added, duplicateRef, previewRef, verseCount);
    clearPendingVerses();
    router.dismiss();
  };

  return (
    <SafeAreaView
      edges={['top']}
      className="flex-1 bg-neutral-50 dark:bg-neutral-900"
    >
      <ScreenHeader
        title={
          verseCount === 1
            ? 'Add to stack'
            : `Add ${verseCount} verses to stack`
        }
        leading="close"
        onLeading={onClose}
      />

      <RodKeyboardAvoidingView keyboardVerticalOffset={0}>
        {creating ? (
          <View className="px-4 pt-2 pb-4">
            <Text className="text-xs uppercase tracking-wider font-semibold text-brand-700 dark:text-brand-300 mb-2">
              New stack
            </Text>
            <View className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 px-4 py-3">
              <TextInput
                ref={titleInputRef}
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="Working title"
                placeholderTextColor={isDark ? '#737373' : '#a3a3a3'}
                returnKeyType="done"
                onSubmitEditing={onConfirmCreate}
                keyboardAppearance={isDark ? 'dark' : 'light'}
                className="text-base text-neutral-900 dark:text-white"
              />
            </View>
            <View className="flex-row gap-2 mt-3">
              <AnimatedPressable
                onPress={onCancelCreate}
                className="flex-1 bg-neutral-100 dark:bg-neutral-800 rounded-2xl h-12 items-center justify-center"
              >
                <Text className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                  Cancel
                </Text>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={onConfirmCreate}
                disabled={!newTitle.trim()}
                className="flex-1 bg-brand-500 rounded-2xl h-12 items-center justify-center"
                style={{opacity: newTitle.trim() ? 1 : 0.45}}
              >
                <Text className="text-sm font-semibold text-white">
                  Create and add
                </Text>
              </AnimatedPressable>
            </View>
          </View>
        ) : (
          <AnimatedPressable
            onPress={onStartCreate}
            className="mx-4 mt-2 mb-3 flex-row items-center bg-white dark:bg-neutral-800 rounded-2xl border border-dashed border-brand-300 dark:border-brand-700 px-4 py-3"
          >
            <View className="w-9 h-9 rounded-full bg-brand-50 dark:bg-brand-900/40 items-center justify-center">
              <Plus size={20} color={isDark ? '#fbbf24' : '#b45309'} />
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-base font-semibold text-neutral-900 dark:text-white">
                New stack
              </Text>
              <Text className="text-xs text-neutral-500 dark:text-neutral-400">
                Start a fresh draft with{' '}
                {verseCount === 1 ? 'this verse' : `these ${verseCount} verses`}
              </Text>
            </View>
          </AnimatedPressable>
        )}

        {sortedStacks.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8 -mt-6">
            <View className="w-14 h-14 rounded-full bg-brand-50 dark:bg-brand-900/40 items-center justify-center mb-3">
              <Layers size={24} color={isDark ? '#fbbf24' : '#b45309'} />
            </View>
            <Text className="text-base font-semibold text-neutral-900 dark:text-white text-center">
              No stacks yet
            </Text>
            <Text className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 text-center">
              Create your first one above.
            </Text>
          </View>
        ) : (
          <FlatList
            data={sortedStacks}
            keyExtractor={s => s.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{paddingHorizontal: 16, paddingBottom: 24}}
            renderItem={({item}) => (
              <StackPickerRow
                stack={item}
                pendingVerses={pendingVerses}
                items={items}
                onPress={() => onPickStack(item)}
              />
            )}
            ListHeaderComponent={
              <Text className="text-xs uppercase tracking-wider font-semibold text-neutral-500 dark:text-neutral-400 mb-2 mt-1">
                Existing
              </Text>
            }
          />
        )}
      </RodKeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StackPickerRow({
  stack,
  pendingVerses,
  items,
  onPress,
}: {
  stack: Stack;
  pendingVerses: Verse[];
  items: ReturnType<typeof useStacksStore.getState>['items'];
  onPress: () => void;
}) {
  // Same-set match: an item already in this stack whose reference equals
  // the reference we'd build from the current pending selection.
  const alreadyHasSet = useMemo(() => {
    const targetRef = previewSetReference(pendingVerses);
    if (!targetRef) return false;
    return items.some(
      i =>
        i.stackId === stack.id &&
        i.kind === 'verse' &&
        i.reference === targetRef
    );
  }, [items, stack.id, pendingVerses]);

  const sections = useStacksStore(s => s.sections);
  const itemCount = (stack.sectionIds ?? []).reduce((acc, sid) => {
    const section = sections.find(s => s.id === sid);
    return acc + (section?.itemIds.length ?? 0);
  }, 0);

  return (
    <AnimatedPressable
      onPress={onPress}
      className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 mb-2 px-4 py-3"
    >
      <View className="flex-row items-center justify-between mb-1">
        <Text
          className="text-base font-semibold text-neutral-900 dark:text-white flex-1 mr-2"
          numberOfLines={1}
        >
          {stack.title}
        </Text>
        <Text className="text-xs text-neutral-500 dark:text-neutral-400">
          {STACK_STATUS_LABEL[stack.status]}
        </Text>
      </View>
      <Text className="text-xs text-neutral-500 dark:text-neutral-400">
        {itemCount === 0
          ? 'Empty'
          : `${itemCount} item${itemCount === 1 ? '' : 's'}`}
        {alreadyHasSet ? ' · already in stack' : ''}
      </Text>
    </AnimatedPressable>
  );
}
