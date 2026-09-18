jest.mock('../../../lib/supabase', () => ({ supabase: { from: jest.fn() } }));

import { supabase } from '../../../lib/supabase';
import { deleteTransaction, updateTransaction } from '../transactionsRepo';

const from = supabase.from as unknown as jest.Mock;

beforeEach(() => {
  from.mockReset();
});

it('updates a transaction and replaces its items', async () => {
  const single = jest.fn().mockResolvedValue({
    data: {
      id: 't1', name: 'New', date: '2026-09-18', time: '1:00 PM', category_id: 'c1',
      type: 'expense', amount: 5, icon: 'x', note: null, receipt_path: null, receipt_data: null,
    },
    error: null,
  });
  const update = jest.fn((_payload: Record<string, unknown>) => ({ eq: jest.fn(() => ({ select: jest.fn(() => ({ single })) })) }));
  const itemsEq = jest.fn().mockResolvedValue({ error: null });
  const itemsDelete = jest.fn(() => ({ eq: itemsEq }));
  const itemsInsert = jest.fn().mockResolvedValue({ error: null });
  from.mockImplementation((table: string) =>
    table === 'transactions' ? { update } : { delete: itemsDelete, insert: itemsInsert },
  );

  const out = await updateTransaction('t1', {
    name: 'New', date: '2026-09-18', time: '1:00 PM', categoryId: 'c1', type: 'expense',
    amount: 5, icon: 'x', items: [{ id: 'i1', name: 'Milk', price: 2 }],
  });

  expect(update).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'New', amount: 5, category_id: 'c1' }),
  );
  expect(update.mock.calls[0][0]).not.toHaveProperty('receipt_data');
  expect(update.mock.calls[0][0]).not.toHaveProperty('receipt_path');
  expect(itemsDelete).toHaveBeenCalled();
  expect(itemsInsert).toHaveBeenCalledWith([
    expect.objectContaining({ transaction_id: 't1', name: 'Milk', price: 2, position: 0 }),
  ]);
  expect(out.name).toBe('New');
  expect(out.items).toEqual([{ id: 'i1', name: 'Milk', quantity: undefined, price: 2 }]);
});

it('deletes a transaction by id', async () => {
  const eq = jest.fn().mockResolvedValue({ error: null });
  const del = jest.fn(() => ({ eq }));
  from.mockImplementation(() => ({ delete: del }));

  await deleteTransaction('t1');

  expect(del).toHaveBeenCalled();
  expect(eq).toHaveBeenCalledWith('id', 't1');
});
