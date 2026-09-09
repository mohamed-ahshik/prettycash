import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Mask, Pattern, Rect, Stop } from 'react-native-svg';
import { colors, fonts, radii } from '../theme';
import { formatMoney } from '../utils/format';
import { Icon } from './Icon';

interface BalanceCardProps {
  total: number;
  income: number;
  expense: number;
}

export function BalanceCard({ total, income, expense }: BalanceCardProps) {
  return (
    <View style={styles.stack}>
      <View style={[styles.backdrop, styles.backdropOuter]} />
      <View style={[styles.backdrop, styles.backdropInner]} />
      <View style={styles.card}>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <Pattern id="dots" width={18} height={18} patternUnits="userSpaceOnUse">
                <Circle cx={1.1} cy={1.1} r={1.1} fill={colors.secondary} />
              </Pattern>
              <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#000" stopOpacity={1} />
                <Stop offset="0.7" stopColor="#000" stopOpacity={0} />
              </LinearGradient>
              <Mask id="mask">
                <Rect width="100%" height="100%" fill="url(#fade)" />
              </Mask>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#dots)" mask="url(#mask)" opacity={0.9} />
          </Svg>
        </View>

        <View style={styles.topRow}>
          <View style={styles.balanceLabelRow}>
            <Text style={styles.balanceLabel}>Total balance</Text>
            <Icon name="eye-outline" size={16} color={colors.mutedForeground} />
          </View>
          <Text style={styles.balanceValue}>${formatMoney(total)}</Text>
        </View>

        <View style={styles.split}>
          <View style={styles.splitItem}>
            <View style={styles.splitIcon}>
              <Icon name="arrow-down-left" size={18} color={colors.incomeText} />
            </View>
            <View>
              <Text style={styles.splitLabel}>Income</Text>
              <Text style={styles.splitValue}>+${formatMoney(income)}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.splitItem}>
            <View style={styles.splitIcon}>
              <Icon name="arrow-up-right" size={18} color={colors.expenseText} />
            </View>
            <View>
              <Text style={styles.splitLabel}>Expense</Text>
              <Text style={styles.splitValue}>${formatMoney(expense)}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    marginTop: 24,
  },
  backdrop: {
    position: 'absolute',
    height: 96,
    borderRadius: radii.lg,
  },
  backdropOuter: {
    top: -8,
    left: 12,
    right: 12,
    backgroundColor: '#DFF0EB',
  },
  backdropInner: {
    top: -4,
    left: 24,
    right: 24,
    backgroundColor: '#C9E7DE',
  },
  card: {
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    overflow: 'hidden',
  },
  topRow: {
    marginBottom: 16,
  },
  balanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: fonts.medium,
    color: colors.mutedForeground,
  },
  balanceValue: {
    marginTop: 4,
    fontSize: 32,
    fontWeight: '700',
    fontFamily: fonts.bold,
    letterSpacing: -0.5,
    color: colors.foreground,
  },
  split: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radii.md,
    padding: 12,
    backgroundColor: colors.muted,
  },
  splitItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  splitIcon: {
    height: 36,
    width: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  splitLabel: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: fonts.medium,
    color: colors.mutedForeground,
  },
  splitValue: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.foreground,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
});
