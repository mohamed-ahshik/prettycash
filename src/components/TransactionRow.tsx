import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Transaction } from '../types';
import { CATEGORY_STYLES, colors, fonts } from '../theme';
import { formatSignedAmount } from '../utils/format';
import { Icon } from './Icon';

interface TransactionRowProps {
  transaction: Transaction;
}

export function TransactionRow({ transaction }: TransactionRowProps) {
  const category = CATEGORY_STYLES[transaction.category];
  const isIncome = transaction.type === 'income';
  const amountColor = isIncome ? colors.incomeText : colors.foreground;

  return (
    <View style={styles.row}>
      <View style={[styles.iconCircle, { backgroundColor: category.bg }]}>
        <Icon name={transaction.icon} size={20} color={category.fg} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{transaction.name}</Text>
        <Text style={styles.meta}>{transaction.time} • {transaction.category}</Text>
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>
        {formatSignedAmount(transaction.type, transaction.amount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  iconCircle: {
    height: 40,
    width: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
