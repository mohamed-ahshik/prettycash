import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Mask, Pattern, Rect, Stop } from 'react-native-svg';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { radii, shadows, text } from '../theme';
import type { ThemeColors } from '../theme';
import { useCurrency } from '../context/CurrencyContext';
import { useBalanceVisibility } from '../hooks/useBalanceVisibility';
import { BALANCE_MASK, EXPENSE_MASK, INCOME_MASK } from '../lib/balanceVisibility';
import { formatCurrency, formatSignedAmount } from '../utils/format';
import { AnimatedNumber } from './AnimatedNumber';
import { Icon } from './Icon';

interface BalanceCardProps {
  total: number;
  income: number;
  expense: number;
}

export function BalanceCard({ total, income, expense }: BalanceCardProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { hidden, toggle } = useBalanceVisibility();
  const { symbol, decimals } = useCurrency();

  return (
    <View style={styles.stack}>
      <View style={styles.card}>
        <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
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
            <Text style={[text.overline, styles.balanceLabel]}>Total balance</Text>
            <Pressable
              onPress={toggle}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={hidden ? 'Show balance' : 'Hide balance'}
            >
              <Icon
                name={hidden ? 'eye-off-outline' : 'eye-outline'}
                size={16}
                color={colors.mutedForeground}
              />
            </Pressable>
          </View>
          {hidden ? (
            <Text style={[text.display, text.money, styles.balanceValue]}>{BALANCE_MASK}</Text>
          ) : (
            <AnimatedNumber
              value={total}
                  format={(v) => formatCurrency(v, symbol, decimals)}
              style={[text.display, text.money, styles.balanceValue]}
            />
          )}
        </View>

        <View style={styles.split}>
          <View style={styles.splitItem}>
            <View style={styles.splitIcon}>
              <Icon name="arrow-down-left" size={18} color={colors.incomeText} />
            </View>
            <View>
              <Text style={[text.overline, styles.splitLabel]}>Income</Text>
              {hidden ? (
                <Text style={[text.bodyLg, text.money, styles.splitValue, styles.incomeValue]}>
                  {INCOME_MASK}
                </Text>
              ) : (
                <AnimatedNumber
                  value={income}
                  format={(v) => formatSignedAmount('income', v, symbol, decimals)}
                  style={[text.bodyLg, text.money, styles.splitValue, styles.incomeValue]}
                />
              )}
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.splitItem}>
            <View style={styles.splitIcon}>
              <Icon name="arrow-up-right" size={18} color={colors.expenseText} />
            </View>
            <View>
              <Text style={[text.overline, styles.splitLabel]}>Expense</Text>
              {hidden ? (
                <Text style={[text.bodyLg, text.money, styles.splitValue, styles.expenseValue]}>
                  {EXPENSE_MASK}
                </Text>
              ) : (
                <AnimatedNumber
                  value={expense}
                  format={(v) => formatSignedAmount('expense', v, symbol, decimals)}
                  style={[text.bodyLg, text.money, styles.splitValue, styles.expenseValue]}
                />
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  stack: {
    marginTop: 24,
  },
  card: {
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 20,
    paddingVertical: 8,
    overflow: 'hidden',
    ...shadows.e1,
  },
  topRow: {
    marginBottom: 8,
  },
  balanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceLabel: {
    color: colors.mutedForeground,
  },
  balanceValue: {
    marginTop: 1,
    color: colors.foreground,
  },
  split: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: colors.muted,
  },
  splitItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  splitIcon: {
    height: 28,
    width: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  splitLabel: {
    color: colors.mutedForeground,
  },
  splitValue: {
    marginTop: 0,
  },
  incomeValue: {
    color: colors.incomeText,
  },
  expenseValue: {
    color: colors.expenseText,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
});
