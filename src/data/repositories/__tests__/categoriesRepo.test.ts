jest.mock('../../../lib/supabase', () => ({ supabase: { from: jest.fn() } }));

import { supabase } from '../../../lib/supabase';
import { insertCategory, updateCategory } from '../categoriesRepo';

const from = supabase.from as unknown as jest.Mock;

beforeEach(() => {
  from.mockReset();
});

it('inserts is_uncategorized', async () => {
  const single = jest.fn().mockResolvedValue({
    data: {
      id: 'c1', name: 'Food', type: 'expense', icon: 'x',
      color_bg: '#fff', color_fg: '#000', notes: null, is_uncategorized: false,
    },
    error: null,
  });
  const select = jest.fn(() => ({ single }));
  const insert = jest.fn(() => ({ select }));
  from.mockImplementation(() => ({ insert }));

  const out = await insertCategory({
    name: 'Food', type: 'expense', icon: 'x', colorBg: '#fff', colorFg: '#000',
  });

  expect(insert).toHaveBeenCalledWith(expect.objectContaining({ is_uncategorized: false }));
  expect(out.isUncategorized).toBe(false);
});

it('updates only the name and notes', async () => {
  const single = jest.fn().mockResolvedValue({
    data: {
      id: 'c1', name: 'Groceries', type: 'expense', icon: 'x',
      color_bg: '#fff', color_fg: '#000', notes: 'Food', is_uncategorized: false,
    },
    error: null,
  });
  const select = jest.fn(() => ({ single }));
  const eq = jest.fn(() => ({ select }));
  const update = jest.fn(() => ({ eq }));
  from.mockImplementation(() => ({ update }));

  const out = await updateCategory('c1', { name: 'Groceries', notes: 'Food' });

  expect(update).toHaveBeenCalledWith({ name: 'Groceries', notes: 'Food' });
  expect(eq).toHaveBeenCalledWith('id', 'c1');
  expect(out.name).toBe('Groceries');
});
