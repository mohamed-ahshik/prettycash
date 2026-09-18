import { CategoryBreakdownItem, CategoryItem, Transaction } from '../types';
import { colors } from '../theme';
import { categoryBreakdown } from './aggregate';

export const MAX_DONUT_SLICES = 6;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface TypeBreakdown {
  total: number;
  items: CategoryBreakdownItem[];
}

export interface InsightsMonthData {
  expense: TypeBreakdown;
  income: TypeBreakdown;
}

export function getInsightsMonthData(
  transactions: Transaction[],
  categories: CategoryItem[],
  ym: string,
): InsightsMonthData {
  return {
    expense: categoryBreakdown(transactions, categories, 'expense', ym),
    income: categoryBreakdown(transactions, categories, 'income', ym),
  };
}

export function capBreakdown(
  items: CategoryBreakdownItem[],
  max: number = MAX_DONUT_SLICES,
): CategoryBreakdownItem[] {
  if (items.length <= max) return items;
  const top = items.slice(0, max);
  const rest = items.slice(max);
  const otherAmount = round2(rest.reduce((sum, item) => sum + item.amount, 0));
  const total = round2(items.reduce((sum, item) => sum + item.amount, 0));
  return [
    ...top,
    {
      id: 'other',
      name: 'Other',
      amount: otherAmount,
      percentage: total > 0 ? Math.round((otherAmount / total) * 1000) / 10 : 0,
      icon: 'dots-horizontal',
      color: colors.mutedForeground,
      bgColor: colors.muted,
    },
  ];
}
