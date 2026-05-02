import {useRouter} from 'expo-router';
import {Check, Minus, Pencil, Plus} from 'lucide-react-native';
import {useColorScheme} from 'nativewind';
import React, {useMemo} from 'react';
import {ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {AnimatedPressable} from '@/components/AnimatedPressable';
import {ScreenHeader} from '@/components/ScreenHeader';
import {hapticLight, hapticSuccess} from '@/lib/haptics';
import type {DiffStatus, ItemDiffEntry, SectionDiffEntry} from '@/lib/markdown';
import {toast} from '@/lib/toast';
import {useStacksStore} from '@/store/useStacksStore';

export default function ImportPreviewScreen() {
  const router = useRouter();
  const {colorScheme} = useColorScheme();
  const isDark = colorScheme === 'dark';

  const preview = useStacksStore(s => s.pendingImport);
  const applyImportPreview = useStacksStore(s => s.applyImportPreview);
  const setPendingImport = useStacksStore(s => s.setPendingImport);

  const counts = useMemo(() => countByStatus(preview?.diff ?? []), [preview]);

  if (!preview) {
    return (
      <SafeAreaView
        edges={['top']}
        className="flex-1 bg-neutral-50 dark:bg-neutral-900"
      >
        <ScreenHeader title="Import" leading="close" />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-base text-neutral-500 dark:text-neutral-400 text-center">
            Nothing to import. Copy a stack as markdown first, then try again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const onCancel = () => {
    hapticLight();
    setPendingImport(null);
    router.dismiss();
  };

  const onConfirm = () => {
    const result = applyImportPreview(preview);
    setPendingImport(null);
    hapticSuccess();
    toast({
      title:
        result.action === 'created'
          ? 'Stack imported'
          : result.action === 'replaced'
            ? 'Stack replaced'
            : 'Stack updated',
      preset: 'done',
    });
    router.dismiss();
    router.push({pathname: '/stack/[id]', params: {id: result.stackId}});
  };

  const headerTitle =
    preview.action === 'create' ? 'Confirm import' : 'Confirm changes';
  const summary =
    preview.action === 'create'
      ? `Creating new stack "${preview.title}"`
      : preview.action === 'replace'
        ? `Replacing "${preview.existingTitle}" with the clipboard`
        : `Updating "${preview.existingTitle}" → "${preview.title}"`;

  const ctaLabel =
    preview.action === 'create'
      ? 'Create stack'
      : preview.action === 'replace'
        ? 'Replace'
        : 'Apply changes';

  return (
    <SafeAreaView
      edges={['top']}
      className="flex-1 bg-neutral-50 dark:bg-neutral-900"
    >
      <ScreenHeader title={headerTitle} leading="close" onLeading={onCancel} />
      <ScrollView contentContainerStyle={{paddingBottom: 32}}>
        <View className="px-4 pt-1 pb-4">
          <Text className="text-base text-neutral-700 dark:text-neutral-200 leading-6">
            {summary}
          </Text>
          <View className="flex-row flex-wrap gap-2 mt-3">
            {counts.added > 0 && (
              <CountChip label={`${counts.added} added`} tone="add" />
            )}
            {counts.changed > 0 && (
              <CountChip label={`${counts.changed} changed`} tone="change" />
            )}
            {counts.removed > 0 && (
              <CountChip label={`${counts.removed} removed`} tone="remove" />
            )}
            {counts.unchanged > 0 && (
              <CountChip
                label={`${counts.unchanged} unchanged`}
                tone="neutral"
              />
            )}
          </View>
        </View>

        {preview.diff.length === 0 ? (
          <View className="mx-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 px-4 py-6">
            <Text className="text-sm text-neutral-500 dark:text-neutral-400 text-center">
              No sections in the imported markdown.
            </Text>
          </View>
        ) : (
          <View className="px-4 gap-3">
            {preview.diff.map((sec, idx) => (
              <SectionCard
                key={`${sec.status}-${idx}`}
                section={sec}
                isDark={isDark}
              />
            ))}
          </View>
        )}

        <View className="mx-4 mt-6 gap-2">
          <AnimatedPressable
            onPress={onConfirm}
            className="bg-brand-500 rounded-2xl h-12 items-center justify-center"
          >
            <Text className="text-white font-semibold text-base">
              {ctaLabel}
            </Text>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={onCancel}
            className="rounded-2xl h-12 items-center justify-center"
          >
            <Text className="text-neutral-600 dark:text-neutral-300 font-medium">
              Cancel
            </Text>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function countByStatus(diff: ReadonlyArray<SectionDiffEntry>) {
  const acc = {unchanged: 0, changed: 0, added: 0, removed: 0};
  for (const sec of diff) {
    acc[sec.status] += 1;
    for (const item of sec.items) {
      acc[item.status] += 1;
    }
  }
  return acc;
}

function SectionCard({
  section,
  isDark,
}: {
  section: SectionDiffEntry;
  isDark: boolean;
}) {
  const tones = sectionToneClasses(section.status);
  const sectionLabel = sectionStatusLabel(section.status);
  const headline = section.title.trim() || '(untitled section)';

  return (
    <View
      className={`rounded-2xl border bg-white dark:bg-neutral-800 ${tones.border}`}
    >
      <View
        className={`flex-row items-start gap-3 px-4 py-3 border-b border-neutral-100 dark:border-neutral-700`}
      >
        <View
          className={`w-8 h-8 rounded-full items-center justify-center mt-0.5 ${tones.glyphBg}`}
        >
          {sectionGlyph(section.status, isDark)}
        </View>
        <View className="flex-1">
          <Text
            className="text-base font-semibold text-neutral-900 dark:text-white"
            numberOfLines={2}
          >
            {headline}
          </Text>
          <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {sectionLabel}
          </Text>
        </View>
      </View>
      {section.items.length === 0 ? (
        <Text className="text-xs text-neutral-400 dark:text-neutral-500 px-4 py-3 italic">
          No items in this section.
        </Text>
      ) : (
        <View>
          {section.items.map((item, idx) => (
            <ItemRow
              key={`${item.status}-${idx}`}
              item={item}
              isDark={isDark}
              isLast={idx === section.items.length - 1}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function ItemRow({
  item,
  isDark,
  isLast,
}: {
  item: ItemDiffEntry;
  isDark: boolean;
  isLast: boolean;
}) {
  const tones = itemToneClasses(item.status);
  const label = itemStatusLabel(item.status);
  const headline = item.headline.trim() || '(no headline)';

  return (
    <View
      className={`flex-row items-start gap-3 px-4 py-3 ${
        isLast ? '' : 'border-b border-neutral-100 dark:border-neutral-700'
      }`}
    >
      <View
        className={`w-7 h-7 rounded-full items-center justify-center mt-0.5 ${tones.glyphBg}`}
      >
        {itemGlyph(item.status, isDark)}
      </View>
      <View className="flex-1">
        <Text
          className="text-sm font-medium text-neutral-900 dark:text-white"
          numberOfLines={2}
        >
          {headline}
        </Text>
        <Text className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          {label}
        </Text>
      </View>
    </View>
  );
}

const TONE = {
  add: {
    glyphBg: 'bg-green-50 dark:bg-green-900/30',
    border: 'border-green-200 dark:border-green-900/40',
    chipBg: 'bg-green-50 dark:bg-green-900/30',
    chipText: 'text-green-700 dark:text-green-300',
  },
  change: {
    glyphBg: 'bg-brand-50 dark:bg-brand-900/40',
    border: 'border-brand-200 dark:border-brand-800',
    chipBg: 'bg-brand-50 dark:bg-brand-900/40',
    chipText: 'text-brand-700 dark:text-brand-300',
  },
  remove: {
    glyphBg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-900/30',
    chipBg: 'bg-red-50 dark:bg-red-900/20',
    chipText: 'text-red-700 dark:text-red-300',
  },
  neutral: {
    glyphBg: 'bg-neutral-100 dark:bg-neutral-700',
    border: 'border-neutral-100 dark:border-neutral-700',
    chipBg: 'bg-neutral-100 dark:bg-neutral-700',
    chipText: 'text-neutral-600 dark:text-neutral-300',
  },
} as const;

function sectionToneClasses(status: DiffStatus) {
  return TONE[statusToTone(status)];
}
function itemToneClasses(status: DiffStatus) {
  return TONE[statusToTone(status)];
}
function statusToTone(status: DiffStatus): keyof typeof TONE {
  if (status === 'added') return 'add';
  if (status === 'changed') return 'change';
  if (status === 'removed') return 'remove';
  return 'neutral';
}

function sectionStatusLabel(status: DiffStatus): string {
  switch (status) {
    case 'added':
      return 'New section';
    case 'removed':
      return 'Will be removed';
    case 'changed':
      return 'Section content changed';
    default:
      return 'Unchanged';
  }
}

function itemStatusLabel(status: DiffStatus): string {
  switch (status) {
    case 'added':
      return 'New item';
    case 'removed':
      return 'Will be removed';
    case 'changed':
      return 'Item content changed';
    default:
      return 'Unchanged';
  }
}

function sectionGlyph(status: DiffStatus, isDark: boolean) {
  return diffGlyph(status, isDark, 16);
}

function itemGlyph(status: DiffStatus, isDark: boolean) {
  return diffGlyph(status, isDark, 14);
}

function diffGlyph(status: DiffStatus, isDark: boolean, size: number) {
  switch (status) {
    case 'added':
      return <Plus size={size} color={isDark ? '#86efac' : '#15803d'} />;
    case 'removed':
      return <Minus size={size} color={isDark ? '#fca5a5' : '#b91c1c'} />;
    case 'changed':
      return <Pencil size={size - 2} color={isDark ? '#fbbf24' : '#b45309'} />;
    default:
      return <Check size={size} color={isDark ? '#a3a3a3' : '#737373'} />;
  }
}

function CountChip({
  label,
  tone,
}: {
  label: string;
  tone: 'add' | 'change' | 'remove' | 'neutral';
}) {
  const t = TONE[tone];
  return (
    <View className={`px-2.5 py-1 rounded-full ${t.chipBg}`}>
      <Text className={`text-xs font-semibold ${t.chipText}`}>{label}</Text>
    </View>
  );
}
