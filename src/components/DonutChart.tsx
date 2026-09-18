import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, fonts } from '../theme';
import { combinedShares } from '../utils/aggregate';
import { sectorPath, segmentAngles } from '../utils/donut';
import { formatMoney } from '../utils/format';
import { TypeBreakdown } from '../utils/insights';
import { Icon } from './Icon';

interface DonutChartProps {
  expense: TypeBreakdown;
  income: TypeBreakdown;
  drill: 'expense' | 'income' | null;
  onDrill: (drill: 'expense' | 'income' | null) => void;
}

interface Arc {
  key: string;
  color: string;
  percentage: number;
  onPress: () => void;
}

interface LegendEntry {
  key: string;
  label: string;
  percent: number;
  color: string;
  onPress?: () => void;
}

export function DonutChart({ expense, income, drill, onDrill }: DonutChartProps) {
  const size = 140;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const inner = radius - strokeWidth / 2;
  const outer = radius + strokeWidth / 2;
  const shares = combinedShares(expense.total, income.total);
  const isEmpty = expense.total === 0 && income.total === 0;

  const arcs: Arc[] = isEmpty
    ? []
    : drill === null
      ? [
          { key: 'expense', color: colors.expenseText, percentage: shares.expense, onPress: () => onDrill('expense') },
          { key: 'income', color: colors.incomeText, percentage: shares.income, onPress: () => onDrill('income') },
        ]
      : (drill === 'expense' ? expense.items : income.items).map((item) => ({
          key: item.id,
          color: item.color,
          percentage: item.percentage,
          onPress: () => onDrill(null),
        }));

  const legend: LegendEntry[] =
    drill === null
      ? [
          { key: 'expense', label: 'Expense', percent: shares.expense, color: colors.expenseText, onPress: () => onDrill('expense') },
          { key: 'income', label: 'Income', percent: shares.income, color: colors.incomeText, onPress: () => onDrill('income') },
        ]
      : (drill === 'expense' ? expense.items : income.items).map((item) => ({
          key: item.id,
          label: item.name,
          percent: item.percentage,
          color: item.color,
        }));

  const centerTitle = isEmpty && drill === null
    ? 'No data'
    : drill === null
      ? 'Tap a segment'
      : drill === 'expense'
        ? 'Expenses'
        : 'Income';
  const centerValue = drill === null
    ? undefined
    : formatMoney(drill === 'expense' ? expense.total : income.total);

  const angles = segmentAngles(arcs.map((arc) => ({ key: arc.key, percentage: arc.percentage })));

  return (
    <View style={styles.card}>
      <View style={styles.chartContainer}>
        <Svg width={size} height={size}>
          {isEmpty ? (
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={colors.muted}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
          ) : (
            arcs.map((arc, index) => (
              <Path
                key={arc.key}
                d={sectorPath(center, center, inner, outer, angles[index].start, angles[index].end)}
                fill={arc.color}
                onPress={arc.onPress}
              />
            ))
          )}
        </Svg>

        {drill === null ? (
          <View style={styles.centerHole} pointerEvents="none">
            <Text style={styles.centerLabel}>{centerTitle}</Text>
            <Icon name="gesture-tap" size={16} color={colors.mutedForeground} />
          </View>
        ) : (
          <Pressable style={styles.centerHole} onPress={() => onDrill(null)}>
            <Text style={styles.centerLabel}>{centerTitle}</Text>
            {centerValue ? (
              <Text style={styles.centerAmount} numberOfLines={1}>{centerValue}</Text>
            ) : null}
            <Icon name="arrow-left" size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      <View style={styles.legendContainer}>
        {isEmpty ? (
          <Text style={styles.emptyLegend}>No transactions this month</Text>
        ) : (
          legend.map((entry) => (
            <Pressable
              key={entry.key}
              style={styles.legendRow}
              onPress={entry.onPress}
              disabled={!entry.onPress}
            >
              <View style={[styles.legendDot, { borderColor: entry.color }]} />
              <Text style={styles.legendName} numberOfLines={1}>{entry.label}</Text>
              <Text style={styles.legendPercent}>{entry.percent.toFixed(1)}%</Text>
            </Pressable>
          ))
        )}
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
    textAlign: 'center',
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
    minHeight: 44,
    paddingVertical: 6,
    justifyContent: 'center',
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
  emptyLegend: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.mutedForeground,
  },
});
