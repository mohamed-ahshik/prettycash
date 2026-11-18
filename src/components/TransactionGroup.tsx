import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Transaction, TransactionGroup as TransactionGroupType } from '../types';
import { useThemedStyles } from '../context/ThemeContext';
import { text } from '../theme';
import type { ThemeColors } from '../theme';
import { TransactionRow } from './TransactionRow';

interface TransactionGroupProps {
  group: TransactionGroupType;
  onPressTransaction?: (t: Transaction) => void;
}

export function TransactionGroup({ group, onPressTransaction }: TransactionGroupProps) {
  const styles = useThemedStyles(makeStyles);

  if (group.transactions.length === 0) {
    return null;
  }

  return (
    <View>
      <View style={styles.header}>
        <Text style={[text.overline, styles.label]}>{group.label}</Text>
      </View>
      {group.transactions.map((transaction, index) => (
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
    paddingTop: 20,
    paddingBottom: 6,
  },
  label: {
    color: colors.foreground,
  },
});
