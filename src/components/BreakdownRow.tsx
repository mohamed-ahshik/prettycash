import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { fonts, text } from '../theme';
import type { ThemeColors } from '../theme';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { motion } from '../theme/motion';
import { CategoryBreakdownItem } from '../types';
import { deriveCategoryColors } from '../utils/categoryColors';
import { formatCurrency } from '../utils/format';
import { CategoryAvatar } from './CategoryAvatar';

interface BreakdownRowProps {
  item: CategoryBreakdownItem;
}

export function BreakdownRow({ item }: BreakdownRowProps) {
  const styles = useThemedStyles(makeStyles);
  const { isDark } = useTheme();
  const { symbol, decimals } = useCurrency();
  const progress = useSharedValue(0);
  const derived = deriveCategoryColors(item.bgColor, item.color, isDark);

  useEffect(() => {
    progress.value = withTiming(Math.min(item.percentage, 100) / 100, {
      duration: motion.duration.sweep,
      easing: Easing.out(Easing.cubic),
    });
  }, [item.percentage, progress]);

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  return (
    <View style={styles.container}>
      <CategoryAvatar icon={item.icon} colorBg={item.bgColor} colorFg={item.color} size={38} />

      {/* Main details and progress bar */}
      <View style={styles.rightContent}>
        <View style={styles.labelRow}>
          <View style={styles.nameWrap}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.percentage}>{item.percentage.toFixed(1)}%</Text>
          </View>
          <Text style={[styles.amount, text.money]}>{formatCurrency(item.amount, symbol, decimals)}</Text>
        </View>

        {/* Proportion bar */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressBar, { backgroundColor: derived.colorFg }, barStyle]}
          />
        </View>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  rightContent: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  nameWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  name: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.foreground,
  },
  percentage: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.mutedForeground,
  },
  amount: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.foreground,
  },
  progressTrack: {
    height: 3.5,
    borderRadius: 2,
    backgroundColor: colors.muted,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    width: '100%',
    borderRadius: 2,
    transformOrigin: 'left',
  },
});
