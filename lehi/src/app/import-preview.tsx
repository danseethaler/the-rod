import {useRouter} from 'expo-router';
import {Check, Minus, Pencil, Plus} from 'lucide-react-native';
import {useColorScheme} from 'nativewind';
import React, {useMemo} from 'react';
import {ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {AnimatedPressable} from '@/components/AnimatedPressable';
import {ScreenHeader} from '@/components/ScreenHeader';
import {hapticLight, hapticSuccess} from '@/lib/haptics';
import type {ItemDiffEntry} from '@/lib/markdown';
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
      title: result.action === 'updated' ? 'Stack updated' : 'Stack imported',
      preset: 'done',
    });
    router.dismiss();
    router.push({pathname: '/stack/[id]', params: {id: result.stackId}});
  };

  const headerTitle =
    preview.action === 'update' ? 'Confirm update' : 'Confirm import';
  const summary =
    preview.action === 'update'
      ? `Updating "${preview.existingTitle}" → "${preview.title}"`
      : `Creating new stack "${preview.title}"`;

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

        <View className="mx-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 overflow-hidden">
          {preview.diff.length === 0 ? (
            <View className="px-4 py-6">
              <Text className="text-sm text-neutral-500 dark:text-neutral-400 text-center">
                No items in the imported markdown.
              </Text>
            </View>
          ) : (
            preview.diff.map((entry, idx) => (
              <DiffRow
                key={`${entry.status}-${idx}`}
                entry={entry}
                isDark={isDark}
                isLast={idx === preview.diff.length - 1}
              />
            ))
          )}
        </View>

        <View className="mx-4 mt-6 gap-2">
          <AnimatedPressable
            onPress={onConfirm}
            className="bg-brand-500 rounded-2xl h-12 items-center justify-center"
          >
            <Text className="text-white font-semibold text-base">
              {preview.action === 'update' ? 'Apply changes' : 'Create stack'}
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

function countByStatus(diff: ReadonlyArray<ItemDiffEntry>) {
  return diff.reduce(
    (acc, e) => {
      acc[e.status] += 1;
      return acc;
    },
    {unchanged: 0, changed: 0, added: 0, removed: 0}
  );
}

function CountChip({
  label,
  tone,
}: {
  label: string;
  tone: 'add' | 'change' | 'remove' | 'neutral';
}) {
  const tones = {
    add: {
      bg: 'bg-green-50 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-300',
    },
    change: {
      bg: 'bg-brand-50 dark:bg-brand-900/40',
      text: 'text-brand-700 dark:text-brand-300',
    },
    remove: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-700 dark:text-red-300',
    },
    neutral: {
      bg: 'bg-neutral-100 dark:bg-neutral-700',
      text: 'text-neutral-600 dark:text-neutral-300',
    },
  } as const;
  const {bg, text} = tones[tone];
  return (
    <View className={`px-2.5 py-1 rounded-full ${bg}`}>
      <Text className={`text-xs font-semibold ${text}`}>{label}</Text>
    </View>
  );
}

function DiffRow({
  entry,
  isDark,
  isLast,
}: {
  entry: ItemDiffEntry;
  isDark: boolean;
  isLast: boolean;
}) {
  const {icon, color, label} = statusGlyph(entry.status, isDark);
  const headline = entry.headline || '(no headline)';
  return (
    <View
      className={`flex-row items-start gap-3 px-4 py-3 ${
        isLast ? '' : 'border-b border-neutral-100 dark:border-neutral-700'
      }`}
    >
      <View
        className="w-8 h-8 rounded-full items-center justify-center mt-0.5"
        style={{backgroundColor: color.bg}}
      >
        {icon}
      </View>
      <View className="flex-1">
        <Text
          className="text-sm font-semibold text-neutral-900 dark:text-white"
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

function statusGlyph(
  status: ItemDiffEntry['status'],
  isDark: boolean
): {icon: React.ReactNode; color: {bg: string; fg: string}; label: string} {
  switch (status) {
    case 'added':
      return {
        icon: <Plus size={16} color={isDark ? '#86efac' : '#15803d'} />,
        color: {bg: isDark ? '#14532d33' : '#dcfce7', fg: ''},
        label: 'New item',
      };
    case 'removed':
      return {
        icon: <Minus size={16} color={isDark ? '#fca5a5' : '#b91c1c'} />,
        color: {bg: isDark ? '#7f1d1d33' : '#fee2e2', fg: ''},
        label: 'Will be removed',
      };
    case 'changed':
      return {
        icon: <Pencil size={14} color={isDark ? '#fbbf24' : '#b45309'} />,
        color: {bg: isDark ? '#78350f33' : '#fef3c7', fg: ''},
        label: 'Body or headline changed',
      };
    default:
      return {
        icon: <Check size={16} color={isDark ? '#a3a3a3' : '#737373'} />,
        color: {bg: isDark ? '#3f3f46' : '#f5f5f5', fg: ''},
        label: 'Unchanged',
      };
  }
}
