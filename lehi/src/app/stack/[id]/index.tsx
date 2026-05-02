import {useLocalSearchParams, useRouter} from 'expo-router';
import {
  Bold,
  CheckCircle2,
  Circle,
  Highlighter,
  Italic,
  Scissors,
  Send,
  SquareDashed,
  Trash2,
  Underline,
  X,
} from 'lucide-react-native';
import {useColorScheme} from 'nativewind';
import React, {useCallback, useMemo, useRef, useState} from 'react';
import {Alert, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Sortable from 'react-native-sortables';

import {AnimatedPressable} from '@/components/AnimatedPressable';
import {
  selectionToCharRange,
  type VerseSelection,
} from '@/components/EditableVerseText';
import {RodKeyboardAvoidingView} from '@/components/RodKeyboardAvoidingView';
import {ScreenHeader} from '@/components/ScreenHeader';
import {StackActionFab} from '@/components/StackActionFab';
import {StackExpandedItem} from '@/components/StackExpandedItem';
import {StackOutlineRow} from '@/components/StackOutlineRow';
import {hapticLight, hapticSuccess} from '@/lib/haptics';
import {toast} from '@/lib/toast';
import type {StackItem, StackItemVerse} from '@/lib/types';
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
  const removeItem = useStacksStore(s => s.removeItem);
  const updateNoteBody = useStacksStore(s => s.updateNoteBody);
  const updateVerseThought = useStacksStore(s => s.updateVerseThought);
  const updateHeadline = useStacksStore(s => s.updateHeadline);
  const updateVerseText = useStacksStore(s => s.updateVerseText);
  const resetVerseText = useStacksStore(s => s.resetVerseText);

  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [activeSelection, setActiveSelection] =
    useState<ActiveSelection | null>(null);

  // Tracks whether a drag was active in the last ~250ms so we can ignore
  // a press that fires immediately after a drag-without-movement (the
  // user holds the row, the drag activates, then they release in place —
  // that's a "drag" we don't want misread as a tap-to-expand).
  const dragRecentlyActiveRef = useRef(false);

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
    hapticLight();
    router.push({pathname: '/stack/[id]/capture', params: {id: stack.id}});
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
        onPress: () => {
          removeItem(item.id);
          if (expandedItemId === item.id) setExpandedItemId(null);
          if (activeSelection?.itemId === item.id) setActiveSelection(null);
          hapticSuccess();
        },
      },
    ]);
  };

  const onToggleExpand = (itemId: string) => {
    if (dragRecentlyActiveRef.current) return;
    hapticLight();
    if (expandedItemId === itemId) {
      // Collapsing — clear the format selection, since it belongs to a
      // verse inside the card that's about to disappear.
      setExpandedItemId(null);
      setActiveSelection(null);
    } else {
      setExpandedItemId(itemId);
    }
  };

  const isFormatBarVisible = activeSelection != null;
  const isDragEnabled = expandedItemId == null;

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

      <RodKeyboardAvoidingView>
        <ScrollView
          contentContainerStyle={{paddingBottom: 120}}
          keyboardShouldPersistTaps="handled"
        >
          {/* Status + count */}
          <View className="mx-4 mt-1 mb-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 overflow-hidden">
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

          {items.length === 0 ? (
            <View className="mx-4 bg-white dark:bg-neutral-800 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-700 px-4 py-8 items-center">
              <Text className="text-base font-semibold text-neutral-700 dark:text-neutral-200 text-center">
                Nothing in this stack yet.
              </Text>
              <Text className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 text-center leading-5">
                Tap the floating button to add a verse or capture a thought.
              </Text>
            </View>
          ) : (
            <View className="px-4">
              <Sortable.Grid
                columns={1}
                data={items}
                keyExtractor={item => item.id}
                rowGap={10}
                sortEnabled={isDragEnabled}
                dragActivationDelay={300}
                hapticsEnabled
                enableActiveItemSnap={false}
                activeItemScale={1.04}
                // Shadow is intentionally 0 — react-native-sortables renders
                // the active item twice (once in its source slot with content
                // hidden, once in a portal at the drag position). Both
                // wrappers carry the same shadow, so when the dragged copy
                // hovers near its source slot the two shadows overlap and
                // read as a blurry doubled outline. Inactive-item fade
                // (default 0.5 opacity on the rest of the list) is enough
                // visual cue that something is being moved.
                activeItemShadowOpacity={0}
                onDragStart={() => {
                  dragRecentlyActiveRef.current = true;
                }}
                onDragEnd={({data}) => {
                  reorderItems(
                    stack.id,
                    data.map(i => i.id)
                  );
                  // Keep the guard up briefly so a press that fires
                  // immediately after release doesn't trip onToggleExpand.
                  setTimeout(() => {
                    dragRecentlyActiveRef.current = false;
                  }, 250);
                }}
                renderItem={({item}) =>
                  expandedItemId === item.id ? (
                    <StackExpandedItem
                      item={item}
                      activeVerseNumber={
                        activeSelection?.itemId === item.id
                          ? activeSelection.verseNumber
                          : null
                      }
                      activeStartToken={
                        activeSelection?.itemId === item.id
                          ? activeSelection.startToken
                          : null
                      }
                      activeEndToken={
                        activeSelection?.itemId === item.id
                          ? activeSelection.endToken
                          : null
                      }
                      onSelectionChange={onItemSelectionChange}
                      onResetVerse={onItemResetVerse}
                      onChangeHeadline={h => updateHeadline(item.id, h)}
                      onChangeNoteBody={b => updateNoteBody(item.id, b)}
                      onChangeThought={t => updateVerseThought(item.id, t)}
                      onRemove={() => onRemoveItem(item)}
                      onCollapse={() => onToggleExpand(item.id)}
                    />
                  ) : (
                    <StackOutlineRow
                      item={item}
                      onPress={() => onToggleExpand(item.id)}
                    />
                  )
                }
              />
            </View>
          )}

          <View className="px-4 mt-8">
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

      <StackActionFab
        hidden={isFormatBarVisible}
        onAddVerse={onAddVerse}
        onAddThought={onCaptureNote}
      />

      {activeSelection && (
        <FormatActionBar
          selection={activeSelection}
          item={
            items.find(i => i.id === activeSelection.itemId) as
              | StackItemVerse
              | undefined
          }
          onApply={kind => {
            applyFormatToActiveSelection(
              activeSelection,
              items,
              kind,
              updateVerseText
            );
          }}
          onTrim={() => {
            applyTrimToActiveSelection(
              activeSelection,
              items,
              updateVerseText,
              setActiveSelection
            );
          }}
          onKeepOnly={() => {
            applyKeepOnlyToActiveSelection(
              activeSelection,
              items,
              updateVerseText,
              setActiveSelection
            );
          }}
          onDone={() => setActiveSelection(null)}
        />
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Format action bar — appears when text inside an expanded verse item is
// selected. Floats above the FAB; the FAB is hidden while this is visible.
// ---------------------------------------------------------------------------

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
      underline: rangeHasFormat(
        parsed,
        charRange.start,
        charRange.end,
        'underline'
      ),
      highlight: rangeHasFormat(
        parsed,
        charRange.start,
        charRange.end,
        'highlight'
      ),
    };
  }, [verseRef, charRange]);

  if (!verseRef || !charRange) return null;

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
          icon={
            <Italic size={20} color={iconColor(activeStates.italic, isDark)} />
          }
          label="Italic"
          active={activeStates.italic}
          onPress={() => onApply('italic')}
        />
        <FormatButton
          icon={
            <Underline
              size={20}
              color={iconColor(activeStates.underline, isDark)}
            />
          }
          label="Underline"
          active={activeStates.underline}
          onPress={() => onApply('underline')}
        />
        <FormatButton
          icon={
            <Highlighter
              size={20}
              color={iconColor(activeStates.highlight, isDark)}
            />
          }
          label="Highlight"
          active={activeStates.highlight}
          onPress={() => onApply('highlight')}
        />
      </View>

      <View className="h-px bg-neutral-200 dark:bg-neutral-700 mx-4" />

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
          icon={
            <SquareDashed size={18} color={isDark ? '#fbbf24' : '#b45309'} />
          }
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
          active ? 'text-white' : 'text-neutral-700 dark:text-neutral-200'
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
