import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Transaction } from '../types';
import { useCategories } from '../context/CategoriesContext';
import { colors, fonts } from '../theme';
import { formatMoney, formatSignedAmount } from '../utils/format';
import { Icon } from './Icon';

interface TransactionRowProps {
  transaction: Transaction;
}

export function TransactionRow({ transaction }: TransactionRowProps) {
  const { expenseCategories, incomeCategories } = useCategories();
  const [expanded, setExpanded] = useState(false);
  const category = [...expenseCategories, ...incomeCategories].find((c) => c.id === transaction.categoryId);
  const bg = category?.colorBg ?? colors.muted;
  const fg = category?.colorFg ?? colors.mutedForeground;
  const iconName = category?.icon ?? transaction.icon;
  const isIncome = transaction.type === 'income';
  const amountColor = isIncome ? colors.incomeText : colors.foreground;
  const hasItems = Boolean(transaction.items?.length);

  return (
    <View>
      <Pressable
        style={styles.row}
        onPress={() => transaction.items?.length && setExpanded((e) => !e)}
      >
        <View style={[styles.iconCircle, { backgroundColor: bg }]}>
          <Icon name={iconName} size={20} color={fg} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{transaction.name}</Text>
          <Text style={styles.meta}>{transaction.time} • {category?.name ?? 'Other'}</Text>
        </View>
        {hasItems && (
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.mutedForeground} />
        )}
        <Text style={[styles.amount, { color: amountColor }]}>
          {formatSignedAmount(transaction.type, transaction.amount)}
        </Text>
      </Pressable>
      {expanded && transaction.items?.map((item) => (
        <View key={item.id} style={styles.itemRow}>
          <Text style={styles.itemName}>{item.quantity ? `${item.quantity}× ` : ''}{item.name}</Text>
          <Text style={styles.itemPrice}>${formatMoney(item.price)}</Text>
        </View>
      ))}
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
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 52,
    paddingRight: 12,
    paddingBottom: 8,
  },
  itemName: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  itemPrice: {
    fontSize: 12,
    color: colors.foreground,
  },
});
