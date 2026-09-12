import { groupTransactionsByDay } from '../groupTransactions';
import { Transaction } from '../../types';

const tx = (over: Partial<Transaction>): Transaction => ({
  id: 'x', name: 'n', date: '2026-09-09', time: '9:00 AM',
  categoryId: 'exp-food', type: 'expense', amount: 10, icon: 'cart-outline', ...over,
});

it('groups by day and computes signed totals', () => {
  const txs = [
    tx({ id: '1', date: '2026-09-09', type: 'expense', amount: 20 }),
    tx({ id: '2', date: '2026-09-09', type: 'income', amount: 50 }),
    tx({ id: '3', date: '2026-09-01', type: 'expense', amount: 5 }),
  ];
  const groups = groupTransactionsByDay(txs, new Date(2026, 8, 9));
  expect(groups.map((g) => g.label)).toEqual(['Today', 'Sep 1']);
  expect(groups[0].total).toBe(30); // -20 + 50
  expect(groups[1].total).toBe(-5);
});
