import { Transaction } from '../../types';
import { toReceiptDraft } from '../transactionDraft';

it('maps a transaction to a receipt draft', () => {
  const t: Transaction = {
    id: 't1', name: 'Cafe', date: '2026-09-18', time: '1:00 PM', categoryId: 'c1',
    type: 'expense', amount: 9.5, icon: 'receipt', note: 'lunch',
    items: [{ id: 'i1', name: 'Latte', quantity: 2, price: 4.75 }],
  };
  expect(toReceiptDraft(t)).toEqual({
    merchant: 'Cafe', amount: 9.5, date: '2026-09-18', time: '1:00 PM', note: 'lunch',
    items: [{ name: 'Latte', quantity: 2, price: 4.75 }],
  });
});

it('defaults note and items when absent', () => {
  const t: Transaction = {
    id: 't2', name: 'X', date: '2026-09-18', time: '', categoryId: '', type: 'income',
    amount: 1, icon: 'receipt',
  };
  expect(toReceiptDraft(t)).toEqual({
    merchant: 'X', amount: 1, date: '2026-09-18', time: '', note: '', items: [],
  });
});
