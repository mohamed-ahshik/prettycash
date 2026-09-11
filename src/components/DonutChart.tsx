import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { colors, fonts } from '../theme';
import { CategoryBreakdownItem } from '../types';
import { formatMoney } from '../utils/format';
import { Icon } from './Icon';

interface DonutChartProps {
  items: CategoryBreakdownItem[];
  total: number;
  type: 'expense' | 'income';
  onToggleType: () => void;
}

export function DonutChart({ items, total, type, onToggleType }: DonutChartProps) {
  const size = 140;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulatedPercent = 0;

  return (
    <View style={styles.card}>
      {/* Donut chart on the left */}
      <View style={styles.chartContainer}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${center}, ${center}`}>
            {/* Background base ring */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={colors.muted}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Colored Category Arcs */}
            {items.map((item) => {
              const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
              accumulatedPercent += item.percentage;

              return (
                <Circle
                  key={item.id}
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={item.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  fill="transparent"
                  strokeLinecap="round"
                />
              );
            })}
          </G>
        </Svg>

        {/* Center pressable hole */}
        <Pressable style={styles.centerHole} onPress={onToggleType}>
          <Text style={styles.centerLabel}>
            {type === 'expense' ? 'Expenses' : 'Income'}
          </Text>
          <Text style={styles.centerAmount} numberOfLines={1}>
            {formatMoney(total)}
          </Text>
          <Icon name="swap-horizontal" size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {/* Legend on the right */}
      <View style={styles.legendContainer}>
        {items.map((item) => (
          <View key={item.id} style={styles.legendRow}>
            <View style={[styles.legendDot, { borderColor: item.color }]} />
            <Text style={styles.legendName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.legendPercent}>{item.percentage.toFixed(1)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 16,
  },
  chartContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerHole: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  centerLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.mutedForeground,
  },
  centerAmount: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.foreground,
    marginVertical: 2,
  },
  legendContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 10,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  legendName: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.foreground,
  },
  legendPercent: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.foreground,
  },
});
