import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { CategoryBreakdownItem } from '../types';
import { BreakdownRow } from './BreakdownRow';

interface BreakdownCardProps {
  items: CategoryBreakdownItem[];
  type: 'expense' | 'income';
}

export function BreakdownCard({ items, type }: BreakdownCardProps) {
  const title = type === 'expense' ? 'Expenses list' : 'Income list';

  return (
    <View style={styles.card}>
      <Text style={styles.headerTitle}>{title}</Text>
      {items.map((item) => (
        <BreakdownRow key={item.id} item={item} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginTop: 16,
  },
  headerTitle: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.mutedForeground,
    marginBottom: 8,
  },
});
