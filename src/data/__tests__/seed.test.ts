import { seedDefaultCategoriesIfNeeded, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../seed';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({})),
}));

jest.mock('../repositories/categoriesRepo');
jest.mock('../repositories/profileRepo');

import { listCategories } from '../repositories/categoriesRepo';
import { isSeeded } from '../repositories/profileRepo';

const mockList = listCategories as jest.Mock;
const mockSeeded = isSeeded as jest.Mock;

it('seeds when profile.seeded is false and categories are empty', async () => {
  mockSeeded.mockResolvedValue(false);
  mockList.mockResolvedValue([]);
  const seeded = await seedDefaultCategoriesIfNeeded();
  expect(seeded).toBe(true);
});

it('does not seed when seeded is true', async () => {
  mockSeeded.mockResolvedValue(true);
  mockList.mockResolvedValue([]);
  const seeded = await seedDefaultCategoriesIfNeeded();
  expect(seeded).toBe(false);
});

it('exports the expected default categories', () => {
  expect(DEFAULT_EXPENSE_CATEGORIES.length).toBeGreaterThan(0);
  expect(DEFAULT_INCOME_CATEGORIES.length).toBeGreaterThan(0);
});
