import { CategoryBreakdownItem, CategoryItem, InsightsData, Transaction } from '../types';
import { categoryBreakdown } from './aggregate';

export function getInsightsData(
  type: 'expense' | 'income',
  categories: CategoryItem[],
  transactions: Transaction[],
  ym: string,
): InsightsData {
  const { total, items } = categoryBreakdown(transactions, categories, type, ym);
  return { total, type, items };
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
