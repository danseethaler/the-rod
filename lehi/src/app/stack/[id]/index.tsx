import {useLocalSearchParams, useRouter} from 'expo-router';
import {
  ArrowDown,
  ArrowUp,
  Bold,
  CheckCircle2,
  Circle,
  FileText,
  Highlighter,
  Italic,
  Plus,
  Quote,
  RotateCcw,
  Scissors,
  Send,
  SquareDashed,
  Trash2,
  Underline,
  X,
} from 'lucide-react-native';
import {useColorScheme} from 'nativewind';
import React, {useCallback, useMemo, useState} from 'react';
import {Alert, ScrollView, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {AnimatedPressable} from '@/components/AnimatedPressable';
import {
  EditableVerseText,
  selectionToCharRange,
  type VerseSelection,
} from '@/components/EditableVerseText';
import {RodKeyboardAvoidingView} from '@/components/RodKeyboardAvoidingView';
import {ScreenHeader} from '@/components/ScreenHeader';
import {hapticLight, hapticSuccess} from '@/lib/haptics';
import {getCanonicalVerseText} from '@/lib/scripture';
import {toast} from '@/lib/toast';
import type {StackItem, StackItemVerse, VerseRef} from '@/lib/types';
import {
  keepOnlyRange,
  parseVerseMarkdown,
  rangeHasFormat,
  serializeVerseMarkdown,
  toggleFormatInRange,
  trimRange,
  type FormatKind,
} from '@/lib/verseFormat';
import {
  resolveStackItems,
  selectStackById,
  useStacksStore,
} from '@/store/useStacksStore';

interface ActiveSelection extends VerseSelection {
  itemId: string;
  verseNumber: number;
}

export default function StackDetailScreen() {
  const {id} = useLocalSearchParams<{id: string}>();
  const router = useRouter();
  const {colorScheme} = useColorScheme();
  const isDark = colorScheme === 'dark';

  const stack = useStacksStore(selectStackById(id));
  const allItems = useStacksStore(s => s.items);
  const items = useMemo(
    () => resolveStackItems(stack, allItems),
    [stack, allItems]
  );
  const setStackStatus = useStacksStore(s => s.setStackStatus);
  const deleteStack = useStacksStore(s => s.deleteStack);
  const reorderItems = useStacksStore(s => s.reorderItems);
  const addNoteToStack = useStacksStore(s => s.addNoteToStack);
  const removeItem = useStacksStore(s => s.removeItem);
  const updateNoteBody = useStacksStore(s => s.updateNoteBody);
  const updateVerseThought = useStacksStore(s => s.updateVerseThought);
  const updateVerseText = useStacksStore(s => s.updateVerseText);
  const resetVerseText = useStacksStore(s => s.resetVerseText);

  const [draftNote, setDraftNote] = useState('');
  const [activeSelection, setActiveSelection] = useState<ActiveSelection | null>(null);

  // Stable callbacks for the per-item selection / reset paths — must be
  // declared before the early return below so the hook order stays
  // consistent across renders. Without useCallback these would be
  // re-created every render, defeating React.memo on the item / verse
  // components downstream.
  const onItemSelectionChange = useCallback(
    (itemId: string, verseNumber: number, sel: VerseSelection | null) => {
      if (sel == null) {
        setActiveSelection(null);
        return;
      }
      setActiveSelection({
        itemId,
        verseNumber,
        startToken: sel.startToken,
        endToken: sel.endToken,
      });
    },
    []
  );

  const onItemResetVerse = useCallback(
    (itemId: string, verseNumber: number) => {
      Alert.alert(
        'Reset verse?',
        'This restores the original scripture text and discards any inline edits or trims for this verse.',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Reset',
            style: 'destructive',
            onPress: () => {
              resetVerseText(itemId, verseNumber);
              setActiveSelection(prev =>
                prev?.itemId === itemId && prev?.verseNumber === verseNumber
                  ? null
                  : prev
              );
              hapticSuccess();
              toast({title: 'Verse reset', preset: 'done'});
            },
          },
        ]
      );
    },
    [resetVerseText]
  );

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
      "This permanently removes the stack and all its items. This can't be undone.",
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
              icon={
                <FileText size={14} color={isDark ? '#fbbf24' : '#b45309'} />
              }
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
              icon={
                <ArrowUp size={14} color={isDark ? '#fbbf24' : '#b45309'} />
              }
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
            items.map((item, idx) => {
              // Pass selection as primitives so React.memo on ItemCard /
              // VerseRow / EditableVerseText can short-circuit when an
              // unrelated verse owns the selection.
              const ownsSelection = activeSelection?.itemId === item.id;
              return (
                <ItemCard
                  key={item.id}
                  item={item}
                  index={idx}
                  total={items.length}
                  activeVerseNumber={
                    ownsSelection ? activeSelection.verseNumber : null
                  }
                  activeStartToken={
                    ownsSelection ? activeSelection.startToken : null
                  }
                  activeEndToken={
                    ownsSelection ? activeSelection.endToken : null
                  }
                  onSelectionChange={onItemSelectionChange}
                  onResetVerse={onItemResetVerse}
                  onMoveUp={() => onMove(idx, -1)}
                  onMoveDown={() => onMove(idx, 1)}
                  onRemove={() => onRemoveItem(item)}
                  onChangeNoteBody={b => updateNoteBody(item.id, b)}
                  onChangeThought={t => updateVerseThought(item.id, t)}
                />
              );
            })
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

      {activeSelection && (
        <FormatActionBar
          selection={activeSelection}
          item={
            items.find((i) => i.id === activeSelection.itemId) as
              | StackItemVerse
              | undefined
          }
          onApply={(kind) => {
            applyFormatToActiveSelection(activeSelection, items, kind, updateVerseText);
          }}
          onTrim={() => {
            applyTrimToActiveSelection(activeSelection, items, updateVerseText, setActiveSelection);
          }}
          onKeepOnly={() => {
            applyKeepOnlyToActiveSelection(activeSelection, items, updateVerseText, setActiveSelection);
          }}
          onDone={() => setActiveSelection(null)}
        />
      )}
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

interface ItemCardProps {
  item: StackItem;
  index: number;
  total: number;
  /** Verse number that owns the selection on THIS item, or null. */
  activeVerseNumber: number | null;
  activeStartToken: number | null;
  activeEndToken: number | null;
  onSelectionChange: (
    itemId: string,
    verseNumber: number,
    sel: VerseSelection | null
  ) => void;
  onResetVerse: (itemId: string, verseNumber: number) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onChangeNoteBody: (b: string) => void;
  onChangeThought: (t: string) => void;
}

const ItemCard = React.memo(function ItemCard({
  item,
  index,
  total,
  activeVerseNumber,
  activeStartToken,
  activeEndToken,
  onSelectionChange,
  onResetVerse,
  onMoveUp,
  onMoveDown,
  onRemove,
  onChangeNoteBody,
  onChangeThought,
}: ItemCardProps) {
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
          {item.headline}
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
        <>
          <View className="px-4 py-3" style={{rowGap: 12}}>
            {item.verses.map((v) => {
              const owns = activeVerseNumber === v.verse;
              return (
                <VerseRow
                  key={v.verse}
                  item={item}
                  verse={v}
                  startToken={owns ? activeStartToken : null}
                  endToken={owns ? activeEndToken : null}
                  onSelectionChange={onSelectionChange}
                  onResetVerse={onResetVerse}
                />
              );
            })}
          </View>
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
        </>
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
    </View>
  );
});

// ---------------------------------------------------------------------------
// Per-verse row + bottom action bar for inline formatting & trim
// ---------------------------------------------------------------------------

interface VerseRowProps {
  item: StackItemVerse;
  verse: VerseRef;
  /** Token indices when this verse owns the selection, else null. */
  startToken: number | null;
  endToken: number | null;
  onSelectionChange: (
    itemId: string,
    verseNumber: number,
    sel: VerseSelection | null
  ) => void;
  onResetVerse: (itemId: string, verseNumber: number) => void;
}

const VerseRow = React.memo(function VerseRow({
  item,
  verse,
  startToken,
  endToken,
  onSelectionChange,
  onResetVerse,
}: VerseRowProps) {
  const {colorScheme} = useColorScheme();
  const isDark = colorScheme === 'dark';

  const isEdited = useMemo(() => {
    const canonical = getCanonicalVerseText(
      item.standardWorkSlug,
      item.bookSlug,
      item.chapter,
      verse.verse
    );
    return canonical != null && verse.text !== canonical;
  }, [item.standardWorkSlug, item.bookSlug, item.chapter, verse.verse, verse.text]);

  const handleEditorSelection = useCallback(
    (next: VerseSelection | null) => {
      onSelectionChange(item.id, verse.verse, next);
    },
    [onSelectionChange, item.id, verse.verse]
  );

  const handleReset = useCallback(() => {
    onResetVerse(item.id, verse.verse);
  }, [onResetVerse, item.id, verse.verse]);

  return (
    <View className="flex-row">
      <Text className="text-sm font-semibold text-brand-600 dark:text-brand-400 w-7 mt-0.5">
        {verse.verse}
      </Text>
      <View className="flex-1 flex-row items-start">
        <View className="flex-1">
          <EditableVerseText
            itemId={item.id}
            verseNumber={verse.verse}
            markdown={verse.text}
            startToken={startToken}
            endToken={endToken}
            onSelectionChange={handleEditorSelection}
          />
        </View>
        {isEdited && (
          <AnimatedPressable
            onPress={handleReset}
            className="ml-2 mt-0.5 w-7 h-7 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-700"
            accessibilityLabel={`Reset verse ${verse.verse}`}
          >
            <RotateCcw size={14} color={isDark ? '#a3a3a3' : '#737373'} />
          </AnimatedPressable>
        )}
      </View>
    </View>
  );
});

function FormatActionBar({
  selection,
  item,
  onApply,
  onTrim,
  onKeepOnly,
  onDone,
}: {
  selection: ActiveSelection;
  item: StackItemVerse | undefined;
  onApply: (kind: FormatKind) => void;
  onTrim: () => void;
  onKeepOnly: () => void;
  onDone: () => void;
}) {
  const {colorScheme} = useColorScheme();
  const isDark = colorScheme === 'dark';

  const verseRef = item?.verses.find(v => v.verse === selection.verseNumber);
  const charRange = useMemo(() => {
    if (!verseRef) return null;
    return selectionToCharRange(verseRef.text, {
      startToken: selection.startToken,
      endToken: selection.endToken,
    });
  }, [verseRef, selection.startToken, selection.endToken]);

  const activeStates = useMemo(() => {
    if (!verseRef || !charRange) {
      return {bold: false, italic: false, underline: false, highlight: false};
    }
    const parsed = parseVerseMarkdown(verseRef.text);
    return {
      bold: rangeHasFormat(parsed, charRange.start, charRange.end, 'bold'),
      italic: rangeHasFormat(parsed, charRange.start, charRange.end, 'italic'),
      underline: rangeHasFormat(parsed, charRange.start, charRange.end, 'underline'),
      highlight: rangeHasFormat(parsed, charRange.start, charRange.end, 'highlight'),
    };
  }, [verseRef, charRange]);

  if (!verseRef || !charRange) return null;

  // Floating card: lifted off the bottom edge, rounded, shadowed, with
  // generous padding inside so the controls breathe.
  return (
    <View
      className="absolute left-3 right-3 bottom-6 rounded-3xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
      style={{
        shadowColor: '#000',
        shadowOpacity: 0.22,
        shadowRadius: 22,
        shadowOffset: {width: 0, height: 8},
        elevation: 16,
      }}
    >
      {/* Header row: title + close */}
      <View className="flex-row items-center px-4 pt-3 pb-1">
        <Text className="text-xs uppercase tracking-wider font-semibold text-neutral-500 dark:text-neutral-400 flex-1">
          Verse {selection.verseNumber}
        </Text>
        <AnimatedPressable
          onPress={onDone}
          accessibilityLabel="Done"
          className="w-9 h-9 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-700 -mr-1"
        >
          <X size={18} color={isDark ? '#f5f5f5' : '#171717'} />
        </AnimatedPressable>
      </View>

      {/* Format row */}
      <View
        className="flex-row items-stretch px-3 pt-1 pb-2"
        style={{columnGap: 8}}
      >
        <FormatButton
          icon={<Bold size={20} color={iconColor(activeStates.bold, isDark)} />}
          label="Bold"
          active={activeStates.bold}
          onPress={() => onApply('bold')}
        />
        <FormatButton
          icon={<Italic size={20} color={iconColor(activeStates.italic, isDark)} />}
          label="Italic"
          active={activeStates.italic}
          onPress={() => onApply('italic')}
        />
        <FormatButton
          icon={<Underline size={20} color={iconColor(activeStates.underline, isDark)} />}
          label="Underline"
          active={activeStates.underline}
          onPress={() => onApply('underline')}
        />
        <FormatButton
          icon={<Highlighter size={20} color={iconColor(activeStates.highlight, isDark)} />}
          label="Highlight"
          active={activeStates.highlight}
          onPress={() => onApply('highlight')}
        />
      </View>

      {/* Divider */}
      <View className="h-px bg-neutral-200 dark:bg-neutral-700 mx-4" />

      {/* Trim row */}
      <View
        className="flex-row items-stretch px-3 pt-3 pb-3"
        style={{columnGap: 8}}
      >
        <TrimButton
          icon={<Scissors size={18} color={isDark ? '#fbbf24' : '#b45309'} />}
          label="Trim selection"
          sublabel="Replace with …"
          onPress={onTrim}
        />
        <TrimButton
          icon={<SquareDashed size={18} color={isDark ? '#fbbf24' : '#b45309'} />}
          label="Keep only this"
          sublabel="Trim everything else"
          onPress={onKeepOnly}
        />
      </View>
    </View>
  );
}

function FormatButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityLabel={label}
      className={`flex-1 items-center justify-center rounded-2xl py-3 ${
        active
          ? 'bg-brand-500'
          : 'bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700'
      }`}
    >
      {icon}
      <Text
        className={`text-[11px] mt-1 font-medium ${
          active
            ? 'text-white'
            : 'text-neutral-700 dark:text-neutral-200'
        }`}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

function TrimButton({
  icon,
  label,
  sublabel,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityLabel={label}
      className="flex-1 flex-row items-center bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800 rounded-2xl px-3 py-2.5"
    >
      <View className="w-8 h-8 rounded-full bg-white dark:bg-neutral-800 items-center justify-center mr-2.5">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-brand-800 dark:text-brand-200">
          {label}
        </Text>
        <Text className="text-[11px] text-brand-700/80 dark:text-brand-300/80">
          {sublabel}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

function iconColor(active: boolean, isDark: boolean): string {
  if (active) return '#ffffff';
  return isDark ? '#f5f5f5' : '#171717';
}

// ---------------------------------------------------------------------------
// Selection action helpers — operate on the active selection by looking
// up the current verse text from the items snapshot, applying the
// transform, and writing the result back through the store.
// ---------------------------------------------------------------------------

function applyFormatToActiveSelection(
  selection: ActiveSelection,
  items: StackItem[],
  kind: FormatKind,
  updateVerseText: (itemId: string, verseNumber: number, text: string) => void
) {
  const item = items.find(i => i.id === selection.itemId);
  if (!item || item.kind !== 'verse') return;
  const verseRef = item.verses.find(v => v.verse === selection.verseNumber);
  if (!verseRef) return;
  const range = selectionToCharRange(verseRef.text, {
    startToken: selection.startToken,
    endToken: selection.endToken,
  });
  if (!range) return;
  const parsed = parseVerseMarkdown(verseRef.text);
  const next = toggleFormatInRange(parsed, range.start, range.end, kind);
  updateVerseText(item.id, verseRef.verse, serializeVerseMarkdown(next));
}

function applyTrimToActiveSelection(
  selection: ActiveSelection,
  items: StackItem[],
  updateVerseText: (itemId: string, verseNumber: number, text: string) => void,
  setActiveSelection: (next: ActiveSelection | null) => void
) {
  const item = items.find(i => i.id === selection.itemId);
  if (!item || item.kind !== 'verse') return;
  const verseRef = item.verses.find(v => v.verse === selection.verseNumber);
  if (!verseRef) return;
  const range = selectionToCharRange(verseRef.text, {
    startToken: selection.startToken,
    endToken: selection.endToken,
  });
  if (!range) return;
  const parsed = parseVerseMarkdown(verseRef.text);
  const next = trimRange(parsed, range.start, range.end);
  updateVerseText(item.id, verseRef.verse, serializeVerseMarkdown(next));
  // Trim changes token indices — clear selection so the user re-selects
  // intentionally.
  setActiveSelection(null);
}

function applyKeepOnlyToActiveSelection(
  selection: ActiveSelection,
  items: StackItem[],
  updateVerseText: (itemId: string, verseNumber: number, text: string) => void,
  setActiveSelection: (next: ActiveSelection | null) => void
) {
  const item = items.find(i => i.id === selection.itemId);
  if (!item || item.kind !== 'verse') return;
  const verseRef = item.verses.find(v => v.verse === selection.verseNumber);
  if (!verseRef) return;
  const range = selectionToCharRange(verseRef.text, {
    startToken: selection.startToken,
    endToken: selection.endToken,
  });
  if (!range) return;
  const parsed = parseVerseMarkdown(verseRef.text);
  const next = keepOnlyRange(parsed, range.start, range.end);
  updateVerseText(item.id, verseRef.verse, serializeVerseMarkdown(next));
  setActiveSelection(null);
}
