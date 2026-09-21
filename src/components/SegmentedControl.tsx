import React, { useEffect, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useThemedStyles } from '../context/ThemeContext';
import { fonts, radii, shadows } from '../theme';
import type { ThemeColors } from '../theme';
import { motion } from '../theme/motion';
import { hapticSelection } from '../lib/haptics';
import { CategoryType } from '../types';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

export const CATEGORY_TYPE_OPTIONS: SegmentedControlOption<CategoryType>[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
];

interface SegmentedControlProps<T extends string> {
  selected: T;
  onSelect: (value: T) => void;
  options: SegmentedControlOption<T>[];
  style?: StyleProp<ViewStyle>;
}

export function SegmentedControl<T extends string>({
  selected,
  onSelect,
  options,
  style,
}: SegmentedControlProps<T>) {
  const styles = useThemedStyles(makeStyles);
  const [width, setWidth] = useState(0);
  const translateX = useSharedValue(0);
  const thumbWidth = width > 0 ? (width - 8) / options.length : 0;
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === selected));

  useEffect(() => {
    translateX.value = withSpring(selectedIndex * thumbWidth, motion.spring.thumb);
  }, [selectedIndex, thumbWidth, translateX]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      {thumbWidth > 0 ? (
        <Animated.View style={[styles.thumb, { width: thumbWidth }, thumbStyle]} />
      ) : null}
      {options.map((option) => (
        <Pressable
          key={option.value}
          style={styles.segment}
          onPress={() => {
            hapticSelection();
            onSelect(option.value);
          }}
        >
          <Text style={[styles.label, selected === option.value && styles.activeLabel]}>
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.muted,
    borderRadius: radii.pill,
    padding: 4,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 320,
    marginTop: 16,
    marginBottom: 20,
  },
  thumb: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    ...shadows.e1,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    fontFamily: fonts.semibold,
    color: colors.mutedForeground,
  },
  activeLabel: {
    color: colors.primaryForeground,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
});
