import {FileText, Plus, Search} from 'lucide-react-native';
import {useColorScheme} from 'nativewind';
import React, {useCallback} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import {hapticMedium, hapticSelection} from '@/lib/haptics';

const FAB_SIZE = 56;
const ITEM_SIZE = 48;
const ARC_RADIUS = 92;

const expandTiming = {duration: 220, easing: Easing.out(Easing.cubic)};
const collapseTiming = {duration: 160, easing: Easing.in(Easing.cubic)};
const pressDownTiming = {duration: 100, easing: Easing.out(Easing.cubic)};
const pressUpTiming = {duration: 150, easing: Easing.out(Easing.cubic)};

interface FabAction {
  key: string;
  label: string;
  icon: typeof Plus;
  /** Angle from the FAB center, in radians. 90° = straight up, 180° = left. */
  angle: number;
  onPress: () => void;
}

interface Props {
  /** Hide the FAB entirely (e.g. when a modal action bar is visible). */
  hidden?: boolean;
  onAddVerse: () => void;
  onAddThought: () => void;
}

/**
 * Bottom-right FAB that fans out into two labeled actions on tap. Modeled
 * after Pday's `CenterPlusButton` but scaled down for two items at a corner.
 *
 * The menu items fan upward and to the left from the FAB; the FAB itself
 * rotates 45° (Plus → X) when open, and a scrim dims the rest of the
 * screen so the open menu reads as modal.
 */
export function StackActionFab({hidden, onAddVerse, onAddThought}: Props) {
  const {colorScheme} = useColorScheme();
  const isDark = colorScheme === 'dark';
  const reduceMotion = useReducedMotion();

  const progress = useSharedValue(0);
  const isOpen = useSharedValue(false);
  const buttonScale = useSharedValue(1);

  const close = useCallback(() => {
    progress.value = reduceMotion ? 0 : withTiming(0, collapseTiming);
    isOpen.value = false;
  }, [progress, isOpen, reduceMotion]);

  const toggle = useCallback(() => {
    if (isOpen.value) {
      close();
    } else {
      hapticMedium();
      progress.value = reduceMotion ? 1 : withTiming(1, expandTiming);
      isOpen.value = true;
    }
  }, [progress, isOpen, close, reduceMotion]);

  const handleSelect = useCallback(
    (action: FabAction) => {
      hapticSelection();
      close();
      // Small delay so the close animation begins visibly before navigation.
      setTimeout(() => action.onPress(), 120);
    },
    [close]
  );

  const actions: FabAction[] = [
    {
      key: 'thought',
      label: 'Add a thought',
      icon: FileText,
      angle: (90 * Math.PI) / 180,
      onPress: onAddThought,
    },
    {
      key: 'verse',
      label: 'Search for a verse',
      icon: Search,
      angle: (150 * Math.PI) / 180,
      onPress: onAddVerse,
    },
  ];

  const plusStyle = useAnimatedStyle(() => ({
    transform: [
      {rotate: `${interpolate(progress.value, [0, 1], [0, 45])}deg`},
      {scale: buttonScale.value},
    ],
  }));

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
    pointerEvents: progress.value > 0.05 ? 'auto' : 'none',
  }));

  if (hidden) return null;

  return (
    <>
      {/* Scrim — covers the whole screen so taps outside the menu close it. */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)',
          },
          scrimStyle,
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      {/* FAB anchor — items fan from the FAB's center. */}
      <View style={styles.anchor} pointerEvents="box-none">
        {actions.map((action, idx) => (
          <FanItem
            key={action.key}
            action={action}
            index={idx}
            progress={progress}
            onSelect={handleSelect}
          />
        ))}

        <Pressable
          onPressIn={() => {
            buttonScale.value = reduceMotion
              ? 0.9
              : withTiming(0.9, pressDownTiming);
          }}
          onPressOut={() => {
            buttonScale.value = reduceMotion
              ? 1
              : withTiming(1, pressUpTiming);
          }}
          onPress={toggle}
          accessibilityLabel="Add to stack"
          style={styles.fab}
        >
          <Animated.View style={plusStyle}>
            <Plus size={26} color="#ffffff" strokeWidth={2.5} />
          </Animated.View>
        </Pressable>
      </View>
    </>
  );
}

function FanItem({
  action,
  index,
  progress,
  onSelect,
}: {
  action: FabAction;
  index: number;
  progress: SharedValue<number>;
  onSelect: (action: FabAction) => void;
}) {
  const {colorScheme} = useColorScheme();
  const isDark = colorScheme === 'dark';
  const reduceMotion = useReducedMotion();

  // Standard math: dx = cos·r, dy = -sin·r (sin negated because screen Y is
  // flipped). For our bottom-right FAB the action angles live in the upper
  // half (90°-180°), so cos goes negative — items move LEFT and UP.
  const dx = Math.cos(action.angle) * ARC_RADIUS;
  const dy = -Math.sin(action.angle) * ARC_RADIUS;
  const scale = useSharedValue(1);

  const wrapStyle = useAnimatedStyle(() => {
    const stagger = index * 0.08;
    const itemProgress = Math.max(
      0,
      Math.min(1, (progress.value - stagger) / (1 - stagger))
    );
    return {
      opacity: interpolate(itemProgress, [0, 0.4, 1], [0, 0.8, 1]),
      transform: [
        {translateX: interpolate(itemProgress, [0, 1], [0, dx])},
        {translateY: interpolate(itemProgress, [0, 1], [0, dy])},
        {scale: interpolate(itemProgress, [0, 1], [0.3, 1]) * scale.value},
      ],
    };
  });

  const labelStyle = useAnimatedStyle(() => {
    const stagger = index * 0.08;
    const itemProgress = Math.max(
      0,
      Math.min(1, (progress.value - stagger) / (1 - stagger))
    );
    return {
      opacity: interpolate(itemProgress, [0.6, 1], [0, 1]),
    };
  });

  const Icon = action.icon;

  return (
    <Animated.View style={[styles.fanItem, wrapStyle]}>
      <Pressable
        onPressIn={() => {
          scale.value = reduceMotion
            ? 0.88
            : withTiming(0.88, pressDownTiming);
        }}
        onPressOut={() => {
          scale.value = reduceMotion ? 1 : withTiming(1, pressUpTiming);
        }}
        onPress={() => onSelect(action)}
        style={{alignItems: 'center'}}
      >
        <View
          style={[
            styles.itemCircle,
            {
              backgroundColor: isDark ? '#fafafa' : '#ffffff',
              shadowColor: '#000',
              shadowOffset: {width: 0, height: 6},
              shadowOpacity: isDark ? 0.5 : 0.18,
              shadowRadius: 12,
              elevation: 10,
            },
          ]}
        >
          <Icon size={22} color="#b45309" strokeWidth={2} />
        </View>
        <Animated.Text
          style={[
            styles.itemLabel,
            {color: isDark ? '#f5f5f5' : '#ffffff'},
            labelStyle,
          ]}
        >
          {action.label}
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    width: FAB_SIZE,
    height: FAB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  fanItem: {
    position: 'absolute',
    alignItems: 'center',
  },
  itemCircle: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: ITEM_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    width: 110,
  },
});
