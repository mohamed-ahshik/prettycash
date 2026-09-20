import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, fonts, radii, shadows } from '../theme';
import { motion } from '../theme/motion';
import { hapticSelection } from '../lib/haptics';
import { CategoryType } from '../types';

interface SegmentedControlProps {
  selected: CategoryType;
  onSelect: (type: CategoryType) => void;
}

export function SegmentedControl({ selected, onSelect }: SegmentedControlProps) {
  const [width, setWidth] = useState(0);
  const translateX = useSharedValue(0);
  const thumbWidth = width > 0 ? (width - 8) / 2 : 0;

  useEffect(() => {
    translateX.value = withSpring(
      (selected === 'expense' ? 0 : 1) * thumbWidth,
      motion.spring.thumb,
    );
  }, [selected, thumbWidth, translateX]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {thumbWidth > 0 ? (
        <Animated.View style={[styles.thumb, { width: thumbWidth }, thumbStyle]} />
      ) : null}
      <Pressable
        style={styles.segment}
        onPress={() => {
          hapticSelection();
          onSelect('expense');
        }}
      >
        <Text style={[styles.label, selected === 'expense' && styles.activeLabel]}>Expense</Text>
      </Pressable>
      <Pressable
        style={styles.segment}
        onPress={() => {
          hapticSelection();
          onSelect('income');
        }}
      >
        <Text style={[styles.label, selected === 'income' && styles.activeLabel]}>Income</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
