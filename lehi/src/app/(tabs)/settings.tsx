import Constants from 'expo-constants';
import {useRouter} from 'expo-router';
import {ChevronRight, Info, Layers, Search} from 'lucide-react-native';
import {useColorScheme} from 'nativewind';
import React from 'react';
import {Linking, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {AnimatedPressable} from '@/components/AnimatedPressable';
import {hapticLight} from '@/lib/haptics';

export default function SettingsScreen() {
  const router = useRouter();
  const {colorScheme} = useColorScheme();
  const isDark = colorScheme === 'dark';
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      className="flex-1 bg-neutral-50 dark:bg-neutral-900"
    >
      <ScrollView contentContainerStyle={{paddingBottom: 32}}>
        <View className="px-4 py-3">
          <Text className="text-3xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            Settings
          </Text>
          <Text className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            About Krumb
          </Text>
        </View>

        <View className="mx-4 mb-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 overflow-hidden">
          <Row
            icon={<Search size={20} color={isDark ? '#fbbf24' : '#b45309'} />}
            title="Standard Works"
            subtitle="Bundled offline. Old & New Testament, Book of Mormon, D&C, Pearl of Great Price."
          />
          <Divider />
          <Row
            icon={<Layers size={20} color={isDark ? '#fbbf24' : '#b45309'} />}
            title="Stacks live on this device"
            subtitle="No sync, no account. Local only by design."
          />
        </View>

        <View className="mx-4 mb-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 overflow-hidden">
          <View className="px-4 py-3">
            <Text className="text-xs uppercase tracking-wide font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
              Vision
            </Text>
            <Text className="text-base text-neutral-900 dark:text-neutral-100 leading-6">
              Compress the friction of gathering and rearranging so the time
              left over is for pondering.
            </Text>
            <Text className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 italic">
              "Man doth not live by bread only, but by every word that
              proceedeth out of the mouth of the Lord." — Deuteronomy 8:3
            </Text>
          </View>
        </View>

        <View className="mx-4 mb-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 overflow-hidden">
          <AnimatedPressable
            onPress={() => {
              hapticLight();
              router.push('/about' as never);
            }}
            className="flex-row items-center px-4 py-3 gap-3"
          >
            <View className="w-9 h-9 rounded-full bg-brand-50 dark:bg-brand-900/40 items-center justify-center">
              <Info size={20} color={isDark ? '#fbbf24' : '#b45309'} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-neutral-900 dark:text-white">
                About Krumb
              </Text>
              <Text className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                Why this app exists, and how to use it.
              </Text>
            </View>
            <ChevronRight size={20} color={isDark ? '#737373' : '#a3a3a3'} />
          </AnimatedPressable>
        </View>

        <View className="mx-4 mb-4 bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 overflow-hidden">
          <AnimatedPressable
            onPress={() => {
              hapticLight();
              Linking.openURL(
                'https://www.churchofjesuschrist.org/study/scriptures'
              ).catch(() => {});
            }}
            className="px-4 py-3"
          >
            <Text className="text-base font-medium text-neutral-900 dark:text-white">
              Read on Gospel Library
            </Text>
            <Text className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              churchofjesuschrist.org
            </Text>
          </AnimatedPressable>
        </View>

        <View className="px-6 mt-2 items-center">
          <Text className="text-xs text-neutral-400 dark:text-neutral-500">
            Krumb · v{version}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <View className="flex-row items-start px-4 py-3 gap-3">
      <View className="w-9 h-9 rounded-full bg-brand-50 dark:bg-brand-900/40 items-center justify-center mt-0.5">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-neutral-900 dark:text-white">
          {title}
        </Text>
        <Text className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 leading-5">
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

function Divider() {
  return <View className="h-px bg-neutral-100 dark:bg-neutral-700 ml-16" />;
}
