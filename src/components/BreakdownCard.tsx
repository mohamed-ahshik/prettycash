import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { CategoryBreakdownItem } from '../types';
import { BreakdownRow } from './BreakdownRow';
import { Icon } from './Icon';

interface BreakdownCardProps {
  items: CategoryBreakdownItem[];
  type: 'expense' | 'income';
  collapsible?: boolean;
}

export function BreakdownCard({ items, type, collapsible }: BreakdownCardProps) {
  const [expanded, setExpanded] = useState(true);
  const title = type === 'expense' ? 'Expenses list' : 'Income list';
  const open = collapsible ? expanded : true;

  const header = (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      {collapsible ? (
        <View style={styles.headerRight}>
          <Text style={styles.headerCount}>{items.length}</Text>
          <Icon
            name={open ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.mutedForeground}
          />
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.card}>
      {collapsible ? (
        <Pressable onPress={() => setExpanded((prev) => !prev)} accessibilityRole="button">
          {header}
        </Pressable>
      ) : (
        header
      )}
      {open ? items.map((item) => <BreakdownRow key={item.id} item={item} />) : null}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.mutedForeground,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerCount: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.mutedForeground,
  },
});
