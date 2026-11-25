import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Transaction, TransactionGroup as TransactionGroupType } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { fonts, text } from '../theme';
import type { ThemeColors } from '../theme';
import { formatCurrency } from '../utils/format';
import { Icon } from './Icon';
import { TransactionRow } from './TransactionRow';

interface TransactionGroupProps {
  group: TransactionGroupType;
  expanded: boolean;
  onToggle: () => void;
  onPressTransaction?: (t: Transaction) => void;
}

export function TransactionGroup({
  group,
  expanded,
  onToggle,
  onPressTransaction,
}: TransactionGroupProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { symbol, decimals } = useCurrency();

  if (group.transactions.length === 0) {
    return null;
  }

  return (
    <View>
      <Pressable
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`${group.label}, ${formatCurrency(group.total, symbol, decimals)}`}
        accessibilityState={{ expanded }}
        hitSlop={4}
      >
        <Text style={[text.overline, styles.label]}>{group.label}</Text>
        <View style={styles.headerRight}>
          <Text style={styles.total}>
            {formatCurrency(group.total, symbol, decimals)}
          </Text>
          <Icon
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.mutedForeground}
          />
        </View>
      </Pressable>
      {expanded &&
        group.transactions.map((transaction, index) => (
          <TransactionRow
            key={transaction.id}
            transaction={transaction}
            showDivider={index > 0}
            onPress={() => onPressTransaction?.(transaction)}
          />
        ))}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingTop: 20,
    paddingBottom: 6,
  },
  pressed: {
    opacity: 0.75,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    color: colors.foreground,
  },
  total: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.mutedForeground,
  },
});
