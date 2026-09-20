import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { colors, radii, shadows, text } from '../theme';
import { motion } from '../theme/motion';
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
      <Text style={[text.overline, styles.headerTitle]}>{title}</Text>
      {collapsible ? (
        <View style={styles.headerRight}>
          <Text style={[text.caption, styles.headerCount]}>{items.length}</Text>
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
    <Animated.View style={styles.card} layout={LinearTransition.duration(motion.duration.selection)}>
      {collapsible ? (
        <Pressable onPress={() => setExpanded((prev) => !prev)} accessibilityRole="button">
          {header}
        </Pressable>
      ) : (
        header
      )}
      {open ? items.map((item) => <BreakdownRow key={item.id} item={item} />) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginTop: 16,
    ...shadows.e1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitle: {
    color: colors.mutedForeground,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerCount: {
    color: colors.mutedForeground,
  },
});
