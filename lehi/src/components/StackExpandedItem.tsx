import * as Clipboard from 'expo-clipboard';
import {
  ChevronUp,
  Copy,
  ExternalLink,
  RotateCcw,
  Trash2,
} from 'lucide-react-native';
import {useColorScheme} from 'nativewind';
import React, {useCallback, useMemo} from 'react';
import {Linking, Text, TextInput, View} from 'react-native';

import {AnimatedPressable} from '@/components/AnimatedPressable';
import {
  EditableVerseText,
  type VerseSelection,
} from '@/components/EditableVerseText';
import {hapticError, hapticSuccess} from '@/lib/haptics';
import {itemToMarkdown} from '@/lib/markdown';
import {getCanonicalVerseText} from '@/lib/scripture';
import {toast} from '@/lib/toast';
import type {StackItem, StackItemVerse, VerseRef} from '@/lib/types';

interface Props {
  item: StackItem;
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
  onChangeHeadline: (headline: string) => void;
  onChangeNoteBody: (body: string) => void;
  onChangeThought: (thought: string) => void;
  onRemove: () => void;
  onCollapse: () => void;
}

/**
 * Accordion-expanded view of a single stack item. Edits happen here:
 * editable headline, full verse text (with selection + format toolbar via
 * `EditableVerseText`), thought field on verses, body field on notes,
 * and the destructive remove control.
 *
 * The selection state for the format toolbar is owned by the parent
 * (`stack/[id]/index.tsx`) so the floating action bar can read from it.
 */
export const StackExpandedItem = React.memo(function StackExpandedItem({
  item,
  activeVerseNumber,
  activeStartToken,
  activeEndToken,
  onSelectionChange,
  onResetVerse,
  onChangeHeadline,
  onChangeNoteBody,
  onChangeThought,
  onRemove,
  onCollapse,
}: Props) {
  const {colorScheme} = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View
      className="bg-white dark:bg-neutral-800 rounded-2xl border border-brand-200 dark:border-brand-800 overflow-hidden"
      style={{
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: {width: 0, height: 4},
        elevation: 4,
      }}
    >
      {/* Header: collapse + editable headline */}
      <View className="flex-row items-center px-2 py-2 bg-neutral-50 dark:bg-neutral-900/40 border-b border-neutral-100 dark:border-neutral-700 gap-1">
        <AnimatedPressable
          onPress={onCollapse}
          accessibilityLabel="Collapse"
          className="w-9 h-9 items-center justify-center"
        >
          <ChevronUp size={20} color={isDark ? '#fff' : '#171717'} />
        </AnimatedPressable>
        <TextInput
          value={item.headline}
          onChangeText={onChangeHeadline}
          placeholder={item.kind === 'verse' ? item.reference : 'Untitled note'}
          placeholderTextColor={isDark ? '#737373' : '#a3a3a3'}
          className="flex-1 text-base font-semibold text-neutral-900 dark:text-white px-1"
        />
      </View>

      {item.kind === 'verse' ? (
        <VerseBody
          item={item}
          activeVerseNumber={activeVerseNumber}
          activeStartToken={activeStartToken}
          activeEndToken={activeEndToken}
          onSelectionChange={onSelectionChange}
          onResetVerse={onResetVerse}
          onChangeThought={onChangeThought}
          isDark={isDark}
        />
      ) : (
        <View className="px-3 py-3">
          <TextInput
            value={item.body}
            onChangeText={onChangeNoteBody}
            placeholder="Write the note…"
            placeholderTextColor={isDark ? '#737373' : '#a3a3a3'}
            multiline
            textAlignVertical="top"
            className="px-1 py-1 text-base text-neutral-900 dark:text-white"
            style={{minHeight: 80}}
          />
        </View>
      )}

      <View className="flex-row items-center justify-end gap-1 px-2 py-2 border-t border-neutral-100 dark:border-neutral-700">
        {item.kind === 'verse' && item.url ? (
          <ActionButton
            label="Open"
            icon={
              <ExternalLink size={14} color={isDark ? '#fbbf24' : '#b45309'} />
            }
            onPress={() => openInGospelLibrary(item)}
            tone="brand"
            isDark={isDark}
          />
        ) : null}
        <ActionButton
          label="Copy"
          icon={<Copy size={14} color={isDark ? '#fbbf24' : '#b45309'} />}
          onPress={() => copyAsMarkdown(item)}
          tone="brand"
          isDark={isDark}
        />
        <ActionButton
          label="Remove"
          icon={<Trash2 size={14} color={isDark ? '#fca5a5' : '#dc2626'} />}
          onPress={onRemove}
          tone="danger"
          isDark={isDark}
        />
      </View>
    </View>
  );
});

/** Verse body: per-verse editable text rows + the thought field. */
function VerseBody({
  item,
  activeVerseNumber,
  activeStartToken,
  activeEndToken,
  onSelectionChange,
  onResetVerse,
  onChangeThought,
  isDark,
}: {
  item: StackItemVerse;
  activeVerseNumber: number | null;
  activeStartToken: number | null;
  activeEndToken: number | null;
  onSelectionChange: (
    itemId: string,
    verseNumber: number,
    sel: VerseSelection | null
  ) => void;
  onResetVerse: (itemId: string, verseNumber: number) => void;
  onChangeThought: (thought: string) => void;
  isDark: boolean;
}) {
  return (
    <>
      <View className="px-4 py-3" style={{rowGap: 12}}>
        {item.verses.map(v => (
          <VerseRow
            key={v.verse}
            item={item}
            verse={v}
            startToken={activeVerseNumber === v.verse ? activeStartToken : null}
            endToken={activeVerseNumber === v.verse ? activeEndToken : null}
            onSelectionChange={onSelectionChange}
            onResetVerse={onResetVerse}
            isDark={isDark}
          />
        ))}
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
  );
}

const VerseRow = React.memo(function VerseRow({
  item,
  verse,
  startToken,
  endToken,
  onSelectionChange,
  onResetVerse,
  isDark,
}: {
  item: StackItemVerse;
  verse: VerseRef;
  startToken: number | null;
  endToken: number | null;
  onSelectionChange: (
    itemId: string,
    verseNumber: number,
    sel: VerseSelection | null
  ) => void;
  onResetVerse: (itemId: string, verseNumber: number) => void;
  isDark: boolean;
}) {
  const isEdited = useMemo(() => {
    const canonical = getCanonicalVerseText(
      item.standardWorkSlug,
      item.bookSlug,
      item.chapter,
      verse.verse
    );
    return canonical != null && verse.text !== canonical;
  }, [
    item.standardWorkSlug,
    item.bookSlug,
    item.chapter,
    verse.verse,
    verse.text,
  ]);

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

// ---------------------------------------------------------------------------
// Per-item actions
// ---------------------------------------------------------------------------

async function openInGospelLibrary(item: StackItemVerse): Promise<void> {
  const url = item.url;
  if (!url) {
    hapticError();
    toast({title: 'No link for this verse', preset: 'error'});
    return;
  }
  try {
    await Linking.openURL(url);
    hapticSuccess();
  } catch {
    hapticError();
    toast({title: 'Could not open link', preset: 'error'});
  }
}

async function copyAsMarkdown(item: StackItem): Promise<void> {
  const md = itemToMarkdown(item);
  await Clipboard.setStringAsync(md);
  hapticSuccess();
  toast({title: 'Copied as markdown', preset: 'done'});
}

function ActionButton({
  label,
  icon,
  onPress,
  tone,
  isDark,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  tone: 'brand' | 'danger';
  isDark: boolean;
}) {
  void isDark;
  const containerCls =
    tone === 'danger'
      ? 'bg-red-50 dark:bg-red-900/20'
      : 'bg-brand-50 dark:bg-brand-900/30';
  const labelCls =
    tone === 'danger'
      ? 'text-red-600 dark:text-red-300'
      : 'text-brand-700 dark:text-brand-300';

  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityLabel={label}
      className={`flex-row items-center gap-1.5 px-3 py-2 rounded-xl ${containerCls}`}
    >
      {icon}
      <Text className={`text-sm font-medium ${labelCls}`}>{label}</Text>
    </AnimatedPressable>
  );
}
