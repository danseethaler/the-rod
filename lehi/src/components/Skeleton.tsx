import React, {useEffect} from 'react';
import {type DimensionValue} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import {useReducedMotion} from '@/hooks/useReducedMotion';

interface SkeletonProps {
  width: DimensionValue;
  height: number;
  borderRadius?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  borderRadius = 8,
}) => {
  const opacity = useSharedValue(0.3);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 0.5;
      return;
    }
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, {duration: 800}),
        withTiming(0.3, {duration: 800})
      ),
      -1
    );
  }, [opacity, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      className="bg-neutral-200 dark:bg-neutral-700"
      style={[{width, height, borderRadius}, animatedStyle]}
    />
  );
};
