import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TransactionGroup as TransactionGroupType } from '../types';
import { colors, fonts } from '../theme';
import { formatSignedMoney } from '../utils/format';
import { TransactionRow } from './TransactionRow';

interface TransactionGroupProps {
  group: TransactionGroupType;
}

export function TransactionGroup({ group }: TransactionGroupProps) {
  if (group.transactions.length === 0) {
    return null;
  }

  const totalColor = group.total >= 0 ? colors.incomeText : colors.foreground;

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.label}>{group.label}</Text>
        <Text style={[styles.total, { color: totalColor }]}>{formatSignedMoney(group.total)}</Text>
      </View>
      {group.transactions.map((transaction) => (
        <TransactionRow key={transaction.id} transaction={transaction} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.foreground,
  },
  total: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
});
