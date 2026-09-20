import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, fonts, radii, shadows, text } from '../theme';
import { motion } from '../theme/motion';
import { combinedShares } from '../utils/aggregate';
import { sectorPath, segmentAngles } from '../utils/donut';
import { hapticSelection } from '../lib/haptics';
import { formatCurrency } from '../utils/format';
import { useCurrency } from '../context/CurrencyContext';
import { capBreakdown, TypeBreakdown } from '../utils/insights';
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
  const { symbol, decimals } = useCurrency();
  const size = 160;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const inner = radius - strokeWidth / 2;
  const outer = radius + strokeWidth / 2;
  const shares = combinedShares(expense.total, income.total);
  const isEmpty = expense.total === 0 && income.total === 0;
  const drilledItems =
    drill === null ? [] : capBreakdown(drill === 'expense' ? expense.items : income.items);

  const handleDrill = (next: 'expense' | 'income' | null) => {
    hapticSelection();
    onDrill(next);
  };

  const arcs: Arc[] = isEmpty
    ? []
    : drill === null
      ? [
          { key: 'expense', color: colors.expenseText, percentage: shares.expense, onPress: () => handleDrill('expense') },
          { key: 'income', color: colors.incomeText, percentage: shares.income, onPress: () => handleDrill('income') },
        ]
      : drilledItems.map((item) => ({
          key: item.id,
          color: item.color,
          percentage: item.percentage,
          onPress: () => handleDrill(null),
        }));

  const legend: LegendEntry[] =
    drill === null
      ? [
          { key: 'expense', label: 'Expense', percent: shares.expense, color: colors.expenseText, onPress: () => handleDrill('expense') },
          { key: 'income', label: 'Income', percent: shares.income, color: colors.incomeText, onPress: () => handleDrill('income') },
        ]
      : drilledItems.map((item) => ({
          key: item.id,
          label: item.name,
          percent: item.percentage,
          color: item.color,
        }));

  const centerTitle = drill === null
    ? isEmpty
      ? 'No data'
      : 'Overview'
    : drill === 'expense'
      ? 'Expenses'
      : 'Income';
  const net = income.total - expense.total;
  const centerValue = drill === null
    ? isEmpty
      ? undefined
      : formatCurrency(net, symbol, decimals)
    : formatCurrency(drill === 'expense' ? expense.total : income.total, symbol, decimals);

  const angles = segmentAngles(arcs.map((arc) => ({ key: arc.key, percentage: arc.percentage })));
  const stacked = legend.length > 4;

  return (
    <View style={[styles.card, stacked && styles.cardStacked]}>
      <View style={styles.chartContainer}>
        <Animated.View
          key={drill ?? 'combined'}
          entering={FadeIn.duration(motion.duration.selection)}
        >
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
        </Animated.View>

        <Pressable
          style={styles.centerHole}
          onPress={() =>
            handleDrill(drill === null ? 'expense' : drill === 'expense' ? 'income' : null)
          }
          accessibilityRole="button"
          accessibilityLabel={
            drill === null
              ? 'Show expenses breakdown'
              : drill === 'expense'
                ? 'Show income breakdown'
                : 'Show overview'
          }
        >
          <Text style={[text.overline, styles.centerLabel]}>{centerTitle}</Text>
          {centerValue ? (
            <Text style={[styles.centerAmount, text.money]} numberOfLines={1}>{centerValue}</Text>
          ) : null}
          <Icon
            name={drill === null ? 'gesture-tap' : 'autorenew'}
            size={16}
            color={colors.mutedForeground}
          />
        </Pressable>
      </View>

      <View style={[styles.legendContainer, stacked && styles.legendGrid]}>
        {isEmpty ? (
          <Text style={styles.emptyLegend}>No transactions this month</Text>
        ) : (
          legend.map((entry) => (
            <Pressable
              key={entry.key}
              style={[styles.legendRow, stacked && styles.legendGridItem]}
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
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 16,
    marginTop: 20,
    ...shadows.e1,
  },
  chartContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerHole: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  centerLabel: {
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
  cardStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 4,
    marginTop: 16,
  },
  legendGridItem: {
    width: '48%',
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
