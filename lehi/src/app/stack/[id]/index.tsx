import {useLocalSearchParams, useRouter} from 'expo-router';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Circle,
  FileText,
  Plus,
  Quote,
  Send,
  Trash2,
} from 'lucide-react-native';
import {useColorScheme} from 'nativewind';
import React, {useMemo, useState} from 'react';
import {Alert, ScrollView, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {AnimatedPressable} from '@/components/AnimatedPressable';
import {RodKeyboardAvoidingView} from '@/components/RodKeyboardAvoidingView';
import {ScreenHeader} from '@/components/ScreenHeader';
import {hapticLight, hapticSuccess} from '@/lib/haptics';
import {toast} from '@/lib/toast';
import type {StackItem} from '@/lib/types';
import {
  resolveStackItems,
  selectStackById,
  useStacksStore,
} from '@/store/useStacksStore';

export default function StackDetailScreen() {
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
  const setStackStatus = useStacksStore((s) => s.setStackStatus);
  const deleteStack = useStacksStore((s) => s.deleteStack);
  const reorderItems = useStacksStore((s) => s.reorderItems);
  const addNoteToStack = useStacksStore((s) => s.addNoteToStack);
  const removeItem = useStacksStore((s) => s.removeItem);
  const updateNoteBody = useStacksStore((s) => s.updateNoteBody);
  const updateThought = useStacksStore((s) => s.updateThought);

  const [draftNote, setDraftNote] = useState('');

  if (!stack) {
    return (
      <SafeAreaView
        edges={['top']}
        className="flex-1 bg-neutral-50 dark:bg-neutral-900"
      >
        <ScreenHeader title="Stack not found" />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-base text-neutral-500 dark:text-neutral-400 text-center">
            This stack no longer exists.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const onAddVerse = () => {
    hapticLight();
    router.push({pathname: '/stack/[id]/add', params: {id: stack.id}});
  };

  const onCaptureNote = () => {
    const body = draftNote.trim();
    if (!body) return;
    hapticSuccess();
    addNoteToStack(stack.id, body);
    setDraftNote('');
    toast({title: 'Captured', preset: 'done'});
  };

  const onMove = (idx: number, dir: -1 | 1) => {
    const newOrder = [...stack.itemIds];
    const target = idx + dir;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[idx], newOrder[target]] = [newOrder[target], newOrder[idx]];
    hapticLight();
    reorderItems(stack.id, newOrder);
  };

  const onToggleStatus = () => {
    const nextStatus = stack.status === 'done' ? 'baking' : 'done';
    if (nextStatus === 'done') hapticSuccess();
    else hapticLight();
    setStackStatus(stack.id, nextStatus);
    toast({
      title: nextStatus === 'done' ? 'Marked done' : 'Back to baking',
      preset: 'done',
    });
  };

  const onDelete = () => {
    Alert.alert(
      'Delete stack?',
      'This permanently removes the stack and all its items. This can\'t be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteStack(stack.id);
            hapticSuccess();
            toast({title: 'Stack deleted', preset: 'done'});
            router.back();
          },
        },
      ]
    );
  };

  const onExport = () => {
    hapticLight();
    router.push({pathname: '/stack/[id]/export', params: {id: stack.id}});
  };

  const onRemoveItem = (item: StackItem) => {
    Alert.alert('Remove item?', 'This removes the item from the stack.', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeItem(item.id),
      },
    ]);
  };

  return (
    <SafeAreaView
      edges={['top']}
      className="flex-1 bg-neutral-50 dark:bg-neutral-900"
    >
      <ScreenHeader
        title={stack.title}
        leading="back"
        trailing={
          <AnimatedPressable
            onPress={onExport}
            className="w-10 h-10 items-center justify-center -mr-2"
            accessibilityLabel="Export stack"
          >
            <Send size={22} color={isDark ? '#fff' : '#171717'} />
          </AnimatedPressable>
        }
      />

      <RodKeyboardAvoidingView keyboardVerticalOffset={0}>
        <ScrollView
          contentContainerStyle={{paddingBottom: 32}}
          keyboardShouldPersistTaps="handled"
        >
          {/* Status + actions card */}
          <View className="mx-4 mb-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 overflow-hidden">
            <AnimatedPressable
              onPress={onToggleStatus}
              className="flex-row items-center px-4 py-3"
            >
              {stack.status === 'done' ? (
                <CheckCircle2 size={22} color="#10b981" />
              ) : (
                <Circle size={22} color={isDark ? '#a3a3a3' : '#737373'} />
              )}
              <Text className="ml-3 text-base font-medium text-neutral-900 dark:text-white">
                {stack.status === 'done' ? 'Done' : 'Bake until done'}
              </Text>
              <Text className="ml-auto text-xs text-neutral-500 dark:text-neutral-400">
                {items.length} item{items.length === 1 ? '' : 's'}
              </Text>
            </AnimatedPressable>
          </View>

          {/* Brainstorm capture */}
          <View className="px-4 mb-2">
            <SectionHeading
              icon={<FileText size={14} color={isDark ? '#fbbf24' : '#b45309'} />}
              label="Brainstorm"
              hint="Drop unstructured thoughts. Refine later."
            />
          </View>
          <View className="mx-4 mb-3 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 overflow-hidden">
            <TextInput
              value={draftNote}
              onChangeText={setDraftNote}
              placeholder="A thought, an angle, a question…"
              placeholderTextColor={isDark ? '#737373' : '#a3a3a3'}
              multiline
              textAlignVertical="top"
              className="px-4 py-3 text-base text-neutral-900 dark:text-white"
              style={{minHeight: 90}}
            />
            <View className="flex-row justify-end px-2 pb-2">
              <AnimatedPressable
                onPress={onCaptureNote}
                disabled={!draftNote.trim()}
                className="px-4 py-2 bg-brand-500 rounded-xl"
                style={{opacity: draftNote.trim() ? 1 : 0.45}}
              >
                <Text className="text-white font-semibold text-sm">
                  Capture
                </Text>
              </AnimatedPressable>
            </View>
          </View>

          {/* Filter — invokes search-add-flow */}
          <View className="px-4 mb-2 mt-3">
            <SectionHeading
              icon={<Quote size={14} color={isDark ? '#fbbf24' : '#b45309'} />}
              label="Filter"
              hint="Search the Standard Works. Add what resonates."
            />
          </View>
          <AnimatedPressable
            onPress={onAddVerse}
            className="mx-4 mb-3 flex-row items-center bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 px-4 py-3"
          >
            <View className="w-9 h-9 rounded-full bg-brand-50 dark:bg-brand-900/40 items-center justify-center">
              <Plus size={20} color={isDark ? '#fbbf24' : '#b45309'} />
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-base font-medium text-neutral-900 dark:text-white">
                Add a verse
              </Text>
              <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                Search and pick from the Standard Works
              </Text>
            </View>
          </AnimatedPressable>

          {/* Organize — list of items, manual reorder */}
          <View className="px-4 mb-2 mt-3">
            <SectionHeading
              icon={<ArrowUp size={14} color={isDark ? '#fbbf24' : '#b45309'} />}
              label="Organize"
              hint="Drag the order. The app won't suggest one."
            />
          </View>

          {items.length === 0 ? (
            <View className="mx-4 mb-3 bg-white dark:bg-neutral-800 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-700 px-4 py-6 items-center">
              <Text className="text-sm text-neutral-500 dark:text-neutral-400 text-center">
                No items yet. Capture a thought above or add a verse.
              </Text>
            </View>
          ) : (
            items.map((item, idx) => (
              <ItemCard
                key={item.id}
                item={item}
                index={idx}
                total={items.length}
                onMoveUp={() => onMove(idx, -1)}
                onMoveDown={() => onMove(idx, 1)}
                onRemove={() => onRemoveItem(item)}
                onChangeNoteBody={(b) => updateNoteBody(item.id, b)}
                onChangeThought={(t) => updateThought(item.id, t)}
              />
            ))
          )}

          {/* Danger zone */}
          <View className="px-4 mt-6">
            <AnimatedPressable
              onPress={onDelete}
              className="flex-row items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-2xl py-3"
            >
              <Trash2 size={18} color={isDark ? '#fca5a5' : '#dc2626'} />
              <Text className="ml-2 font-semibold text-red-600 dark:text-red-300">
                Delete stack
              </Text>
            </AnimatedPressable>
          </View>
        </ScrollView>
      </RodKeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SectionHeading({
  icon,
  label,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <View>
      <View className="flex-row items-center gap-1.5">
        {icon}
        <Text className="text-xs uppercase tracking-wider font-semibold text-brand-700 dark:text-brand-300">
          {label}
        </Text>
      </View>
      <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
        {hint}
      </Text>
    </View>
  );
}

function ItemCard({
  item,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onRemove,
  onChangeNoteBody,
  onChangeThought,
}: {
  item: StackItem;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onChangeNoteBody: (b: string) => void;
  onChangeThought: (t: string) => void;
}) {
  const {colorScheme} = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="mx-4 mb-3 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 overflow-hidden">
      <View className="flex-row items-center px-3 py-2 bg-neutral-50 dark:bg-neutral-900/40 border-b border-neutral-100 dark:border-neutral-700">
        <View className="w-7 h-7 rounded-full bg-brand-50 dark:bg-brand-900/40 items-center justify-center">
          <Text className="text-xs font-bold text-brand-700 dark:text-brand-300">
            {index + 1}
          </Text>
        </View>
        <Text
          className="ml-2 flex-1 text-sm font-semibold text-neutral-700 dark:text-neutral-200"
          numberOfLines={1}
        >
          {item.kind === 'verse' ? item.reference : 'Note'}
        </Text>
        <AnimatedPressable
          onPress={onMoveUp}
          disabled={index === 0}
          className="w-9 h-9 items-center justify-center"
          style={{opacity: index === 0 ? 0.3 : 1}}
        >
          <ArrowUp size={18} color={isDark ? '#fff' : '#171717'} />
        </AnimatedPressable>
        <AnimatedPressable
          onPress={onMoveDown}
          disabled={index === total - 1}
          className="w-9 h-9 items-center justify-center"
          style={{opacity: index === total - 1 ? 0.3 : 1}}
        >
          <ArrowDown size={18} color={isDark ? '#fff' : '#171717'} />
        </AnimatedPressable>
        <AnimatedPressable
          onPress={onRemove}
          className="w-9 h-9 items-center justify-center"
          accessibilityLabel="Remove"
        >
          <Trash2 size={16} color={isDark ? '#fca5a5' : '#dc2626'} />
        </AnimatedPressable>
      </View>

      {item.kind === 'verse' ? (
        <View className="px-4 py-3">
          <Text className="text-base text-neutral-900 dark:text-neutral-100 leading-6">
            {item.text}
          </Text>
        </View>
      ) : (
        <View className="px-3 py-2">
          <TextInput
            value={item.body}
            onChangeText={onChangeNoteBody}
            placeholder="Write the note…"
            placeholderTextColor={isDark ? '#737373' : '#a3a3a3'}
            multiline
            textAlignVertical="top"
            className="px-1 py-1 text-base text-neutral-900 dark:text-white"
            style={{minHeight: 60}}
          />
        </View>
      )}

      <View className="px-3 pb-3 pt-1 border-t border-neutral-100 dark:border-neutral-700">
        <Text className="text-xs uppercase tracking-wider font-semibold text-neutral-500 dark:text-neutral-400 mb-1 mt-2">
          Your thought
        </Text>
        <TextInput
          value={item.thought}
          onChangeText={onChangeThought}
          placeholder="Why does this belong in the talk?"
          placeholderTextColor={isDark ? '#737373' : '#a3a3a3'}
          multiline
          textAlignVertical="top"
          className="text-base text-neutral-900 dark:text-white"
          style={{minHeight: 50}}
        />
      </View>
    </View>
  );
}
