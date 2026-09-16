import { CategoryItem, InsightsData, Transaction } from '../types';
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
