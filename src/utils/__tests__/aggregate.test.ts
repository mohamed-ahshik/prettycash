import { CategoryItem, Transaction } from '../../types';
import {
  allTimeBalance,
  categoryBreakdown,
  currentMonthKey,
  filterByMonth,
  monthKey,
  monthTotals,
} from '../aggregate';

const tx = (over: Partial<Transaction>): Transaction => ({
  id: 't',
  name: 'x',
  date: '2026-09-09',
  time: '',
  categoryId: 'c1',
  type: 'expense',
  amount: 1,
  icon: 'receipt',
  ...over,
});

const cat = (over: Partial<CategoryItem>): CategoryItem =>
  ({
    id: 'c1',
    name: 'Food',
    type: 'expense',
    icon: 'silverware-fork-knife',
    colorBg: '#FFFFFF',
    colorFg: '#000000',
    ...over,
  }) as CategoryItem;

describe('monthKey / currentMonthKey / filterByMonth', () => {
  it('derives the month key from an ISO date', () => {
    expect(monthKey('2026-09-09')).toBe('2026-09');
  });

  it('derives the current month key from a date', () => {
    expect(currentMonthKey(new Date(2026, 8, 16))).toBe('2026-09');
  });

  it('filters transactions to a month', () => {
    const list = [tx({ date: '2026-09-01' }), tx({ date: '2026-08-31' })];
    expect(filterByMonth(list, '2026-09')).toHaveLength(1);
  });
});

describe('monthTotals', () => {
  it('sums income and expense for the month only', () => {
    const list = [
      tx({ type: 'income', amount: 5200, date: '2026-09-01' }),
      tx({ type: 'expense', amount: 2140, date: '2026-09-05' }),
      tx({ type: 'income', amount: 999, date: '2026-08-01' }),
    ];
    expect(monthTotals(list, '2026-09')).toEqual({ income: 5200, expense: 2140 });
  });
});

describe('allTimeBalance', () => {
  it('nets all income minus expense', () => {
    const list = [
      tx({ type: 'income', amount: 5200, date: '2026-09-01' }),
      tx({ type: 'expense', amount: 2140, date: '2026-09-05' }),
      tx({ type: 'expense', amount: 100, date: '2026-08-01' }),
    ];
    expect(allTimeBalance(list)).toBe(2960);
  });
});

describe('categoryBreakdown', () => {
  it('groups by category, sorts descending, and computes percentages', () => {
    const categories = [cat({ id: 'c1', name: 'Food' }), cat({ id: 'c2', name: 'Shopping' })];
    const list = [
      tx({ categoryId: 'c2', amount: 13, date: '2026-09-02' }),
      tx({ categoryId: 'c1', amount: 87, date: '2026-09-03' }),
    ];
    const result = categoryBreakdown(list, categories, 'expense', '2026-09');
    expect(result.total).toBe(100);
    expect(result.items.map((i) => i.id)).toEqual(['c1', 'c2']);
    expect(result.items[0].percentage).toBe(87);
    expect(result.items[1].percentage).toBe(13);
  });

  it('buckets missing/unknown categories as Uncategorized', () => {
    const list = [tx({ categoryId: '', amount: 5, date: '2026-09-02' })];
    const result = categoryBreakdown(list, [], 'expense', '2026-09');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('uncategorized');
    expect(result.items[0].name).toBe('Uncategorized');
  });

  it('buckets an unknown non-empty category id as Uncategorized', () => {
    const list = [tx({ categoryId: 'ghost', amount: 5, date: '2026-09-02' })];
    const result = categoryBreakdown(list, [], 'expense', '2026-09');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('uncategorized');
    expect(result.items[0].name).toBe('Uncategorized');
  });

  it('returns empty items when the month has no matching transactions', () => {
    expect(categoryBreakdown([], [], 'expense', '2026-09')).toEqual({ total: 0, items: [] });
  });
});
