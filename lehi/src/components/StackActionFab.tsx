import {FileText, FolderPlus, Plus, Search} from 'lucide-react-native';
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
const ROW_HEIGHT = 48;
const ROW_GAP = 10;
const ROW_OFFSET_BASE = FAB_SIZE + 18; // distance from FAB top to first row's bottom

const expandTiming = {duration: 220, easing: Easing.out(Easing.cubic)};
const collapseTiming = {duration: 160, easing: Easing.in(Easing.cubic)};
const pressDownTiming = {duration: 100, easing: Easing.out(Easing.cubic)};
const pressUpTiming = {duration: 150, easing: Easing.out(Easing.cubic)};

interface FabAction {
  key: string;
  label: string;
  icon: typeof Plus;
  onPress: () => void;
}

interface Props {
  hidden?: boolean;
  onAddSection: () => void;
  onAddVerse: () => void;
  onAddThought: () => void;
}

/**
 * Bottom-right FAB that opens a vertical stack of labeled actions when
 * tapped. Three actions for the stack-detail screen — add a section,
 * search a verse, capture a thought. Modeled loosely on iOS share sheets:
 * pill-shaped rows with the icon on the right and the label flush left,
 * stacked above the FAB with a scrim covering the rest of the screen.
 *
 * Reduced-motion aware: when on, the menu and press scales toggle
 * instantly without timing animations.
 */
export function StackActionFab({
  hidden,
  onAddSection,
  onAddVerse,
  onAddThought,
}: Props) {
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
      // Tiny delay so the close animation begins before navigation /
      // create-section fires.
      setTimeout(() => action.onPress(), 120);
    },
    [close]
  );

  // Order: closest to the FAB first (read top-down: section, verse, thought).
  const actions: FabAction[] = [
    {
      key: 'thought',
      label: 'Add a thought',
      icon: FileText,
      onPress: onAddThought,
    },
    {
      key: 'verse',
      label: 'Search for a verse',
      icon: Search,
      onPress: onAddVerse,
    },
    {
      key: 'section',
      label: 'Add a section',
      icon: FolderPlus,
      onPress: onAddSection,
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

      <View style={styles.anchor} pointerEvents="box-none">
        {actions.map((action, idx) => (
          <StackedRow
            key={action.key}
            action={action}
            index={idx}
            progress={progress}
            onSelect={handleSelect}
            isDark={isDark}
            reduceMotion={reduceMotion}
          />
        ))}

        <Pressable
          onPressIn={() => {
            buttonScale.value = reduceMotion
              ? 0.9
              : withTiming(0.9, pressDownTiming);
          }}
          onPressOut={() => {
            buttonScale.value = reduceMotion ? 1 : withTiming(1, pressUpTiming);
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

function StackedRow({
  action,
  index,
  progress,
  onSelect,
  isDark,
  reduceMotion,
}: {
  action: FabAction;
  index: number;
  progress: SharedValue<number>;
  onSelect: (action: FabAction) => void;
  isDark: boolean;
  reduceMotion: boolean;
}) {
  // Vertical offset: row 0 sits directly above the FAB; subsequent rows
  // stack above with `ROW_HEIGHT + ROW_GAP` spacing. dy is negative because
  // we move upward in screen coordinates.
  const dy = -(ROW_OFFSET_BASE + index * (ROW_HEIGHT + ROW_GAP));

  const scale = useSharedValue(1);

  const wrapStyle = useAnimatedStyle(() => {
    const stagger = index * 0.07;
    const itemProgress = Math.max(
      0,
      Math.min(1, (progress.value - stagger) / (1 - stagger))
    );
    return {
      opacity: interpolate(itemProgress, [0, 0.4, 1], [0, 0.85, 1]),
      transform: [
        {translateY: interpolate(itemProgress, [0, 1], [0, dy])},
        {scale: interpolate(itemProgress, [0, 1], [0.9, 1]) * scale.value},
      ],
    };
  });

  const Icon = action.icon;

  return (
    <Animated.View style={[styles.row, wrapStyle]}>
      <Pressable
        onPressIn={() => {
          scale.value = reduceMotion ? 0.96 : withTiming(0.96, pressDownTiming);
        }}
        onPressOut={() => {
          scale.value = reduceMotion ? 1 : withTiming(1, pressUpTiming);
        }}
        onPress={() => onSelect(action)}
        accessibilityLabel={action.label}
        style={[
          styles.rowInner,
          {
            backgroundColor: isDark ? '#262626' : '#ffffff',
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 6},
            shadowOpacity: isDark ? 0.55 : 0.18,
            shadowRadius: 14,
            elevation: 10,
          },
        ]}
      >
        <Text
          style={[styles.rowLabel, {color: isDark ? '#f5f5f5' : '#171717'}]}
        >
          {action.label}
        </Text>
        <View
          style={[
            styles.rowIconWrap,
            {backgroundColor: isDark ? '#78350f' : '#fef3c7'},
          ]}
        >
          <Icon
            size={18}
            color={isDark ? '#fbbf24' : '#b45309'}
            strokeWidth={2}
          />
        </View>
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
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
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
  row: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    height: ROW_HEIGHT,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  rowInner: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 8,
    borderRadius: ROW_HEIGHT / 2,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
});
