import { CategoryItem, Transaction } from '../../types';
import { getInsightsData } from '../insights';

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

describe('getInsightsData', () => {
  it('computes the breakdown from real transactions for the month and type', () => {
    const categories = [cat({ id: 'c1', name: 'Food', type: 'expense' })];
    const transactions = [
      tx({ type: 'expense', categoryId: 'c1', amount: 12.5, date: '2026-09-02' }),
      tx({ type: 'income', categoryId: 'c1', amount: 99, date: '2026-09-03' }),
    ];
    const result = getInsightsData('expense', categories, transactions, '2026-09');
    expect(result.total).toBe(12.5);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('Food');
    expect(result.items[0].percentage).toBe(100);
  });

  it('returns an empty breakdown when there are no matching transactions', () => {
    expect(getInsightsData('expense', [], [], '2026-09')).toEqual({
      total: 0,
      type: 'expense',
      items: [],
    });
  });
});
