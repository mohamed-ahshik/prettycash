import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { Transaction, TransactionGroup as TransactionGroupType } from '../types';
import { colors, text } from '../theme';
import { motion } from '../theme/motion';
import { TransactionRow } from './TransactionRow';

interface TransactionGroupProps {
  group: TransactionGroupType;
  onPressTransaction?: (t: Transaction) => void;
}

export function TransactionGroup({ group, onPressTransaction }: TransactionGroupProps) {
  if (group.transactions.length === 0) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(motion.duration.enter)}
      layout={LinearTransition.duration(motion.duration.selection)}
    >
      <Animated.View style={styles.header}>
        <Text style={[text.overline, styles.label]}>{group.label}</Text>
      </Animated.View>
      {group.transactions.map((transaction, index) => (
        <TransactionRow
          key={transaction.id}
          transaction={transaction}
          showDivider={index > 0}
          onPress={() => onPressTransaction?.(transaction)}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 20,
    paddingBottom: 6,
  },
  label: {
    color: colors.foreground,
  },
});
