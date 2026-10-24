import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Transaction } from '../types';
import { useCategories } from '../context/CategoriesContext';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { fonts, text } from '../theme';
import type { ThemeColors } from '../theme';
import { useCurrency } from '../context/CurrencyContext';
import { formatSignedAmount } from '../utils/format';
import { CategoryAvatar } from './CategoryAvatar';

interface TransactionRowProps {
  transaction: Transaction;
  showDivider?: boolean;
  onPress?: () => void;
}

export function TransactionRow({ transaction, showDivider, onPress }: TransactionRowProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { expenseCategories, incomeCategories } = useCategories();
  const { symbol, decimals } = useCurrency();
  const category = [...expenseCategories, ...incomeCategories].find((c) => c.id === transaction.categoryId);
  const bg = category?.colorBg ?? colors.muted;
  const fg = category?.colorFg ?? colors.mutedForeground;
  const iconName = category?.icon ?? transaction.icon;
  const isIncome = transaction.type === 'income';
  const amountColor = isIncome ? colors.incomeText : colors.foreground;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        showDivider && styles.borderTop,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <CategoryAvatar icon={iconName} colorBg={bg} colorFg={fg} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{transaction.name}</Text>
        <Text style={styles.meta}>{transaction.time} • {category?.name ?? 'Other'}</Text>
      </View>
      <Text style={[styles.amount, text.money, { color: amountColor }]}>
        {formatSignedAmount(transaction.type, transaction.amount, symbol, decimals)}
      </Text>
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingVertical: 14,
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pressed: {
    opacity: 0.85,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: fonts.semibold,
    color: colors.foreground,
  },
  meta: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
});
