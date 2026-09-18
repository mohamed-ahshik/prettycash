import { CategoryItem, Transaction } from '../../types';
import { getInsightsMonthData } from '../insights';

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

describe('getInsightsMonthData', () => {
  it('breaks the month into expense and income breakdowns', () => {
    const categories = [
      cat({ id: 'c1', name: 'Food', type: 'expense' }),
      cat({ id: 'c2', name: 'Salary', type: 'income' }),
    ];
    const transactions = [
      tx({ type: 'expense', categoryId: 'c1', amount: 12.5, date: '2026-09-02' }),
      tx({ type: 'income', categoryId: 'c2', amount: 100, date: '2026-09-03' }),
      tx({ type: 'expense', categoryId: 'c1', amount: 99, date: '2026-08-01' }),
    ];
    const result = getInsightsMonthData(transactions, categories, '2026-09');
    expect(result.expense.total).toBe(12.5);
    expect(result.expense.items).toHaveLength(1);
    expect(result.income.total).toBe(100);
    expect(result.income.items[0].name).toBe('Salary');
  });

  it('returns empty breakdowns for a month with no transactions', () => {
    expect(getInsightsMonthData([], [], '2026-09')).toEqual({
      expense: { total: 0, items: [] },
      income: { total: 0, items: [] },
    });
  });
});
