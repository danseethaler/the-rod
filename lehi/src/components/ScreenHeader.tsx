import {ChevronLeft, X} from 'lucide-react-native';
import {useColorScheme} from 'nativewind';
import {useRouter} from 'expo-router';
import React from 'react';
import {Text, View} from 'react-native';

import {AnimatedPressable} from '@/components/AnimatedPressable';
import {hapticLight} from '@/lib/haptics';

interface Props {
  title?: string;
  leading?: 'back' | 'close' | 'none';
  onLeading?: () => void;
  trailing?: React.ReactNode;
}

/**
 * Reusable header that sits at the top of every screen. The container does
 * not use a fixed height — content sets it. Stays outside the
 * KeyboardAvoidingView so it doesn't move with the keyboard.
 */
export const ScreenHeader: React.FC<Props> = ({
  title,
  leading = 'back',
  onLeading,
  trailing,
}) => {
  const router = useRouter();
  const {colorScheme} = useColorScheme();
  const isDark = colorScheme === 'dark';

  const onLeadingPress = () => {
    hapticLight();
    if (onLeading) {
      onLeading();
      return;
    }
    if (leading === 'close') {
      router.dismiss();
    } else {
      router.back();
    }
  };

  return (
    <View className="flex-row items-center px-5 pt-2 pb-3">
      <View className="w-10 items-start">
        {leading !== 'none' && (
          <AnimatedPressable
            onPress={onLeadingPress}
            className="w-10 h-10 items-center justify-center -ml-2"
            accessibilityLabel={leading === 'close' ? 'Close' : 'Back'}
          >
            {leading === 'close' ? (
              <X size={26} color={isDark ? '#fff' : '#171717'} />
            ) : (
              <ChevronLeft size={26} color={isDark ? '#fff' : '#171717'} />
            )}
          </AnimatedPressable>
        )}
      </View>
      <View className="flex-1 items-center">
        {!!title && (
          <Text
            className="text-lg font-semibold text-neutral-900 dark:text-white"
            numberOfLines={1}
          >
            {title}
          </Text>
        )}
      </View>
      <View className="w-10 items-end">{trailing}</View>
    </View>
  );
};
