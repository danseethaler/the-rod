import React from 'react';
import {Pressable, type PressableProps} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {useReducedMotion} from '@/hooks/useReducedMotion';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableProps extends PressableProps {
  scaleValue?: number;
  children: React.ReactNode;
}

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  scaleValue = 0.97,
  onPressIn,
  onPressOut,
  style,
  children,
  ...props
}) => {
  const scale = useSharedValue(1);
  const reduceMotion = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  if (reduceMotion) {
    return (
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={style}
        {...props}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <AnimatedPressableBase
      onPressIn={(e) => {
        scale.value = withTiming(scaleValue, {
          duration: 100,
          easing: Easing.out(Easing.cubic),
        });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, {
          duration: 150,
          easing: Easing.out(Easing.cubic),
        });
        onPressOut?.(e);
      }}
      style={[animatedStyle, style]}
      {...props}
    >
      {children}
    </AnimatedPressableBase>
  );
};
