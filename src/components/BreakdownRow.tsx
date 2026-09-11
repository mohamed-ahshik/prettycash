import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { CategoryBreakdownItem } from '../types';
import { formatMoney } from '../utils/format';
import { Icon } from './Icon';

interface BreakdownRowProps {
  item: CategoryBreakdownItem;
}

export function BreakdownRow({ item }: BreakdownRowProps) {
  return (
    <View style={styles.container}>
      {/* Icon badge */}
      <View style={[styles.iconCircle, { backgroundColor: item.bgColor }]}>
        <Icon name={item.icon} size={20} color={item.color} />
      </View>

      {/* Main details and progress bar */}
      <View style={styles.rightContent}>
        <View style={styles.labelRow}>
          <View style={styles.nameWrap}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.percentage}>{item.percentage.toFixed(1)}%</Text>
          </View>
          <Text style={styles.amount}>{formatMoney(item.amount)}</Text>
        </View>

        {/* Proportion bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressBar,
              { width: `${Math.min(item.percentage, 100)}%`, backgroundColor: item.color },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightContent: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  nameWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  name: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.foreground,
  },
  percentage: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.mutedForeground,
  },
  amount: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.foreground,
  },
  progressTrack: {
    height: 3.5,
    borderRadius: 2,
    backgroundColor: colors.muted,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});
