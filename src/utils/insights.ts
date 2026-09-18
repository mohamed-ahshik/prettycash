import { CategoryBreakdownItem, CategoryItem, Transaction } from '../types';
import { categoryBreakdown } from './aggregate';

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
