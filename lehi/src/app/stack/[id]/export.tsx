import * as Clipboard from 'expo-clipboard';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {Clipboard as ClipboardIcon, FileText} from 'lucide-react-native';
import {useColorScheme} from 'nativewind';
import React, {useMemo} from 'react';
import {Linking, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {AnimatedPressable} from '@/components/AnimatedPressable';
import {ScreenHeader} from '@/components/ScreenHeader';
import {hapticError, hapticSuccess} from '@/lib/haptics';
import {bearCreateUrl, stackToMarkdown} from '@/lib/markdown';
import {toast} from '@/lib/toast';
import {selectStackById, useStacksStore} from '@/store/useStacksStore';

export default function ExportScreen() {
  const {id} = useLocalSearchParams<{id: string}>();
  const router = useRouter();
  const {colorScheme} = useColorScheme();
  const isDark = colorScheme === 'dark';

  const stack = useStacksStore(selectStackById(id));
  const allSections = useStacksStore(s => s.sections);
  const allItems = useStacksStore(s => s.items);

  const itemCount = useMemo(() => {
    if (!stack) return 0;
    return (stack.sectionIds ?? []).reduce((acc, sid) => {
      const sec = allSections.find(s => s.id === sid);
      return acc + (sec?.itemIds.length ?? 0);
    }, 0);
  }, [stack, allSections]);

  const md = useMemo(
    () => (stack ? stackToMarkdown(stack, allSections, allItems) : ''),
    [stack, allSections, allItems]
  );

  if (!stack) {
    return null;
  }

  const onCopy = async () => {
    hapticSuccess();
    await Clipboard.setStringAsync(md);
    toast({title: 'Markdown copied', preset: 'done'});
    router.dismiss();
  };

  const onSendToBear = async () => {
    const url = bearCreateUrl(stack.title, md);
    const supported = await Linking.canOpenURL(url).catch(() => false);
    if (!supported) {
      hapticError();
      toast({title: 'Bear not installed', preset: 'error'});
      return;
    }
    hapticSuccess();
    await Linking.openURL(url);
    toast({title: 'Opening Bear', preset: 'done'});
    router.dismiss();
  };

  return (
    <SafeAreaView
      edges={['top']}
      className="flex-1 bg-neutral-50 dark:bg-neutral-900"
    >
      <ScreenHeader title="Export" leading="close" />
      <ScrollView contentContainerStyle={{paddingBottom: 32}}>
        <View className="px-4">
          <Text className="text-base text-neutral-500 dark:text-neutral-400 mb-4 leading-6">
            {itemCount} item
            {itemCount === 1 ? '' : 's'} in{' '}
            <Text className="text-neutral-900 dark:text-white font-medium">
              {stack.title}
            </Text>
            . Send the rendered markdown to a destination.
          </Text>
        </View>

        <View className="mx-4 mb-3 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 overflow-hidden">
          <AnimatedPressable
            onPress={onSendToBear}
            className="flex-row items-center px-4 py-4"
          >
            <View className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-900/40 items-center justify-center">
              <FileText size={20} color={isDark ? '#fbbf24' : '#b45309'} />
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-base font-semibold text-neutral-900 dark:text-white">
                Send to Bear
              </Text>
              <Text className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                Creates a new note via x-callback-url
              </Text>
            </View>
          </AnimatedPressable>
          <View className="h-px bg-neutral-100 dark:bg-neutral-700 ml-16" />
          <AnimatedPressable
            onPress={onCopy}
            className="flex-row items-center px-4 py-4"
          >
            <View className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-900/40 items-center justify-center">
              <ClipboardIcon size={20} color={isDark ? '#fbbf24' : '#b45309'} />
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-base font-semibold text-neutral-900 dark:text-white">
                Copy as markdown
              </Text>
              <Text className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                Paste anywhere — Bear, Notes, Slack
              </Text>
            </View>
          </AnimatedPressable>
        </View>

        {/* Preview */}
        <View className="px-4 mt-4">
          <Text className="text-xs uppercase tracking-wider font-semibold text-neutral-500 dark:text-neutral-400 mb-2">
            Preview
          </Text>
          <View className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 px-4 py-3">
            <Text
              className="text-sm text-neutral-700 dark:text-neutral-300 leading-5"
              style={{fontFamily: 'Menlo'}}
            >
              {md}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
