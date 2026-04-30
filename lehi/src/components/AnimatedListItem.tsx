import React from 'react';
import {type StyleProp, type ViewStyle} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';

import {useReducedMotion} from '@/hooks/useReducedMotion';

interface AnimatedListItemProps {
  index: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const AnimatedListItem: React.FC<AnimatedListItemProps> = ({
  index,
  children,
  style,
}) => {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <Animated.View style={style}>{children}</Animated.View>;
  }

  const cappedIndex = Math.min(index, 10);

  return (
    <Animated.View
      style={style}
      entering={FadeInDown.delay(cappedIndex * 50)
        .duration(300)
        .springify()}
    >
      {children}
    </Animated.View>
  );
};
