import * as Clipboard from 'expo-clipboard';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {
  ArrowDown,
  ArrowUp,
  Bold,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  ClipboardPaste,
  Highlighter,
  Italic,
  Plus,
  Scissors,
  Send,
  SquareDashed,
  Trash2,
  Underline,
  X,
} from 'lucide-react-native';
import {useColorScheme} from 'nativewind';
import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
  Alert,
  type AlertButton,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
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
import {hapticError, hapticLight, hapticSuccess} from '@/lib/haptics';
import {MarkdownParseError} from '@/lib/markdown';
import {toast} from '@/lib/toast';
import type {Section, StackItem, StackItemVerse} from '@/lib/types';
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
  resolveSectionItems,
  resolveStackSections,
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
  const allSections = useStacksStore(s => s.sections);
  const allItems = useStacksStore(s => s.items);
  const sections = useMemo(
    () => resolveStackSections(stack, allSections),
    [stack, allSections]
  );
  const setStackStatus = useStacksStore(s => s.setStackStatus);
  const deleteStack = useStacksStore(s => s.deleteStack);
  const reorderSections = useStacksStore(s => s.reorderSections);
  const reorderItemsInSection = useStacksStore(s => s.reorderItemsInSection);
  const moveItem = useStacksStore(s => s.moveItem);
  const removeItem = useStacksStore(s => s.removeItem);
  const updateNoteBody = useStacksStore(s => s.updateNoteBody);
  const updateVerseThought = useStacksStore(s => s.updateVerseThought);
  const updateHeadline = useStacksStore(s => s.updateHeadline);
  const updateVerseText = useStacksStore(s => s.updateVerseText);
  const resetVerseText = useStacksStore(s => s.resetVerseText);
  const renameSection = useStacksStore(s => s.renameSection);
  const setSectionBody = useStacksStore(s => s.setSectionBody);
  const deleteSection = useStacksStore(s => s.deleteSection);
  const createSection = useStacksStore(s => s.createSection);
  const previewReplace = useStacksStore(s => s.previewReplace);
  const setPendingImport = useStacksStore(s => s.setPendingImport);

  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [collapsedSectionIds, setCollapsedSectionIds] = useState<Set<string>>(
    new Set()
  );
  const [activeSelection, setActiveSelection] =
    useState<ActiveSelection | null>(null);

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

  const itemCount = sections.reduce((acc, s) => acc + s.itemIds.length, 0);

  const onAddVerse = () => {
    hapticLight();
    router.push({pathname: '/stack/[id]/add', params: {id: stack.id}});
  };

  const onCaptureNote = () => {
    hapticLight();
    router.push({pathname: '/stack/[id]/capture', params: {id: stack.id}});
  };

  const onAddSection = () => {
    hapticLight();
    createSection(stack.id);
  };

  const onReplaceFromClipboard = async () => {
    hapticLight();
    const md = await Clipboard.getStringAsync();
    if (!md.trim()) {
      hapticError();
      toast({title: 'Clipboard is empty', preset: 'error'});
      return;
    }
    try {
      const preview = previewReplace(md, stack.id);
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

  const onDeleteSection = (section: Section) => {
    if (sections.length <= 1) {
      toast({title: 'A stack needs at least one section', preset: 'error'});
      return;
    }
    Alert.alert(
      'Delete section?',
      `"${section.title.trim() || 'Untitled section'}" and its ${section.itemIds.length} item${section.itemIds.length === 1 ? '' : 's'} will be permanently removed.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteSection(section.id);
            setCollapsedSectionIds(prev => {
              if (!prev.has(section.id)) return prev;
              const next = new Set(prev);
              next.delete(section.id);
              return next;
            });
            hapticSuccess();
          },
        },
      ]
    );
  };

  const onToggleCollapseSection = (sectionId: string) => {
    hapticLight();
    setCollapsedSectionIds(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const onToggleExpand = (itemId: string) => {
    if (dragRecentlyActiveRef.current) return;
    hapticLight();
    if (expandedItemId === itemId) {
      setExpandedItemId(null);
      setActiveSelection(null);
    } else {
      setExpandedItemId(itemId);
    }
  };

  const isFormatBarVisible = activeSelection != null;

  const onMoveSection = (idx: number, dir: -1 | 1) => {
    const next = [...stack.sectionIds];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    hapticLight();
    reorderSections(stack.id, next);
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
          <View className="flex-row items-center -mr-2">
            <AnimatedPressable
              onPress={onReplaceFromClipboard}
              className="w-10 h-10 items-center justify-center"
              accessibilityLabel="Replace from clipboard"
            >
              <ClipboardPaste size={20} color={isDark ? '#fff' : '#171717'} />
            </AnimatedPressable>
            <AnimatedPressable
              onPress={onExport}
              className="w-10 h-10 items-center justify-center"
              accessibilityLabel="Export stack"
            >
              <Send size={20} color={isDark ? '#fff' : '#171717'} />
            </AnimatedPressable>
          </View>
        }
      />

      <RodKeyboardAvoidingView>
        <ScrollView
          contentContainerStyle={{paddingBottom: 140}}
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
                {itemCount} item{itemCount === 1 ? '' : 's'} · {sections.length}{' '}
                section{sections.length === 1 ? '' : 's'}
              </Text>
            </AnimatedPressable>
          </View>

          <View className="px-4 gap-3">
            {sections.map((section, idx) => (
              <SectionCard
                key={section.id}
                section={section}
                items={resolveSectionItems(section, allItems)}
                isCollapsed={collapsedSectionIds.has(section.id)}
                isOnlySection={sections.length === 1}
                isFirst={idx === 0}
                isLast={idx === sections.length - 1}
                expandedItemId={expandedItemId}
                activeSelection={activeSelection}
                otherSections={sections
                  .filter(s => s.id !== section.id)
                  .map(s => ({id: s.id, title: s.title}))}
                onToggleCollapse={() => onToggleCollapseSection(section.id)}
                onRenameSection={t => renameSection(section.id, t)}
                onChangeBody={b => setSectionBody(section.id, b)}
                onDeleteSection={() => onDeleteSection(section)}
                onMoveSection={dir => onMoveSection(idx, dir)}
                onReorderItems={ids => reorderItemsInSection(section.id, ids)}
                onMoveItemToSection={(itemId, toSectionId) =>
                  moveItem(itemId, section.id, toSectionId)
                }
                onToggleExpandItem={onToggleExpand}
                onItemSelectionChange={onItemSelectionChange}
                onItemResetVerse={onItemResetVerse}
                onChangeHeadline={(itemId, h) => updateHeadline(itemId, h)}
                onChangeNoteBody={(itemId, b) => updateNoteBody(itemId, b)}
                onChangeThought={(itemId, t) => updateVerseThought(itemId, t)}
                onRemoveItem={onRemoveItem}
                isDark={isDark}
              />
            ))}
          </View>

          <View className="px-4 mt-3">
            <AnimatedPressable
              onPress={onAddSection}
              className="flex-row items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700"
            >
              <Plus size={16} color={isDark ? '#a3a3a3' : '#737373'} />
              <Text className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                Add section
              </Text>
            </AnimatedPressable>
          </View>

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
        onAddSection={onAddSection}
        onAddVerse={onAddVerse}
        onAddThought={onCaptureNote}
      />

      {activeSelection && (
        <FormatActionBar
          selection={activeSelection}
          item={
            allItems.find(i => i.id === activeSelection.itemId) as
              | StackItemVerse
              | undefined
          }
          onApply={kind => {
            applyFormatToActiveSelection(
              activeSelection,
              allItems,
              kind,
              updateVerseText
            );
          }}
          onTrim={() => {
            applyTrimToActiveSelection(
              activeSelection,
              allItems,
              updateVerseText,
              setActiveSelection
            );
          }}
          onKeepOnly={() => {
            applyKeepOnlyToActiveSelection(
              activeSelection,
              allItems,
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
// Section card — header (collapsible, editable), inner sortable list of
// items. The inner list is independent from the outer sections sortable.
// ---------------------------------------------------------------------------

interface SectionCardProps {
  section: Section;
  items: StackItem[];
  isCollapsed: boolean;
  isOnlySection: boolean;
  isFirst: boolean;
  isLast: boolean;
  expandedItemId: string | null;
  activeSelection: ActiveSelection | null;
  otherSections: ReadonlyArray<{id: string; title: string}>;
  onToggleCollapse: () => void;
  onRenameSection: (title: string) => void;
  onChangeBody: (body: string) => void;
  onDeleteSection: () => void;
  onMoveSection: (dir: -1 | 1) => void;
  onReorderItems: (newOrder: string[]) => void;
  onMoveItemToSection: (itemId: string, toSectionId: string) => void;
  onToggleExpandItem: (itemId: string) => void;
  onItemSelectionChange: (
    itemId: string,
    verseNumber: number,
    sel: VerseSelection | null
  ) => void;
  onItemResetVerse: (itemId: string, verseNumber: number) => void;
  onChangeHeadline: (itemId: string, headline: string) => void;
  onChangeNoteBody: (itemId: string, body: string) => void;
  onChangeThought: (itemId: string, thought: string) => void;
  onRemoveItem: (item: StackItem) => void;
  isDark: boolean;
}

function SectionCard({
  section,
  items,
  isCollapsed,
  isOnlySection,
  isFirst,
  isLast,
  expandedItemId,
  activeSelection,
  otherSections,
  onToggleCollapse,
  onRenameSection,
  onChangeBody,
  onDeleteSection,
  onMoveSection,
  onReorderItems,
  onMoveItemToSection,
  onToggleExpandItem,
  onItemSelectionChange,
  onItemResetVerse,
  onChangeHeadline,
  onChangeNoteBody,
  onChangeThought,
  onRemoveItem,
  isDark,
}: SectionCardProps) {
  const itemDragEnabled = expandedItemId == null;

  const onMoveItem = (item: StackItem) => {
    if (otherSections.length === 0) return;
    const buttons: AlertButton[] = otherSections.map(s => ({
      text: s.title.trim() || 'Untitled section',
      onPress: () => {
        onMoveItemToSection(item.id, s.id);
        hapticSuccess();
        toast({title: 'Item moved', preset: 'done'});
      },
    }));
    buttons.push({text: 'Cancel', style: 'cancel'});
    Alert.alert(
      'Move to section',
      `Move "${item.headline.trim() || 'this item'}" to:`,
      buttons
    );
  };

  return (
    <View className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 overflow-hidden">
      {/* Header row */}
      <View className="flex-row items-center px-2 py-1.5 bg-neutral-50 dark:bg-neutral-900/40 border-b border-neutral-100 dark:border-neutral-700 gap-1">
        <AnimatedPressable
          onPress={onToggleCollapse}
          className="w-9 h-9 items-center justify-center"
          accessibilityLabel={
            isCollapsed ? 'Expand section' : 'Collapse section'
          }
        >
          {isCollapsed ? (
            <ChevronRight size={18} color={isDark ? '#fff' : '#171717'} />
          ) : (
            <ChevronDown size={18} color={isDark ? '#fff' : '#171717'} />
          )}
        </AnimatedPressable>
        <TextInput
          value={section.title}
          onChangeText={onRenameSection}
          placeholder="Section title"
          placeholderTextColor={isDark ? '#737373' : '#a3a3a3'}
          className="flex-1 text-base font-semibold text-neutral-900 dark:text-white px-1"
        />
        <Text className="text-xs text-neutral-400 dark:text-neutral-500 mr-1">
          {items.length}
        </Text>
        {!isOnlySection && (
          <>
            <AnimatedPressable
              onPress={() => onMoveSection(-1)}
              disabled={isFirst}
              className="w-8 h-8 items-center justify-center"
              style={{opacity: isFirst ? 0.3 : 1}}
              accessibilityLabel="Move section up"
            >
              <ArrowUp size={16} color={isDark ? '#fff' : '#171717'} />
            </AnimatedPressable>
            <AnimatedPressable
              onPress={() => onMoveSection(1)}
              disabled={isLast}
              className="w-8 h-8 items-center justify-center"
              style={{opacity: isLast ? 0.3 : 1}}
              accessibilityLabel="Move section down"
            >
              <ArrowDown size={16} color={isDark ? '#fff' : '#171717'} />
            </AnimatedPressable>
            <AnimatedPressable
              onPress={onDeleteSection}
              className="w-9 h-9 items-center justify-center"
              accessibilityLabel="Delete section"
            >
              <Trash2 size={14} color={isDark ? '#fca5a5' : '#dc2626'} />
            </AnimatedPressable>
          </>
        )}
      </View>

      {!isCollapsed && (
        <>
          {/* Optional body description */}
          <View className="px-3 pt-2 pb-1">
            <TextInput
              value={section.body}
              onChangeText={onChangeBody}
              placeholder="Optional description for this section"
              placeholderTextColor={isDark ? '#737373' : '#a3a3a3'}
              multiline
              textAlignVertical="top"
              className="text-sm text-neutral-700 dark:text-neutral-200 px-1"
            />
          </View>

          {items.length === 0 ? (
            <View className="px-4 py-4">
              <Text className="text-xs text-neutral-400 dark:text-neutral-500 italic">
                No items yet. Use the floating button to add a verse or thought.
              </Text>
            </View>
          ) : (
            <View className="px-2 py-2">
              <Sortable.Grid
                columns={1}
                data={items}
                keyExtractor={i => i.id}
                rowGap={8}
                sortEnabled={itemDragEnabled}
                dragActivationDelay={300}
                hapticsEnabled
                enableActiveItemSnap={false}
                activeItemScale={1.04}
                activeItemShadowOpacity={0}
                onDragEnd={({data}) => {
                  onReorderItems(data.map(i => i.id));
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
                      onChangeHeadline={h => onChangeHeadline(item.id, h)}
                      onChangeNoteBody={b => onChangeNoteBody(item.id, b)}
                      onChangeThought={t => onChangeThought(item.id, t)}
                      onMove={
                        otherSections.length > 0
                          ? () => onMoveItem(item)
                          : undefined
                      }
                      onRemove={() => onRemoveItem(item)}
                      onCollapse={() => onToggleExpandItem(item.id)}
                    />
                  ) : (
                    <StackOutlineRow
                      item={item}
                      onPress={() => onToggleExpandItem(item.id)}
                    />
                  )
                }
              />
            </View>
          )}
        </>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Format action bar — appears when text inside an expanded verse item is
// selected.
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
// Selection helpers (operating on items snapshot)
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
