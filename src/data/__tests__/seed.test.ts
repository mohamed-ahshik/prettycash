import { seedDefaultCategoriesIfNeeded, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../seed';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({})),
}));

jest.mock('../repositories/categoriesRepo');
jest.mock('../repositories/profileRepo');

import { insertCategory, listCategories } from '../repositories/categoriesRepo';
import { isSeeded, setSeeded } from '../repositories/profileRepo';

const mockList = listCategories as jest.Mock;
const mockInsert = insertCategory as jest.Mock;
const mockSeeded = isSeeded as jest.Mock;
const mockSetSeeded = setSeeded as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

it('seeds when profile.seeded is false and categories are empty', async () => {
  mockSeeded.mockResolvedValue(false);
  mockList.mockResolvedValue([]);
  const seeded = await seedDefaultCategoriesIfNeeded();
  expect(seeded).toBe(true);
  expect(mockSetSeeded).toHaveBeenCalledWith(true);
});

it('does not seed when seeded is true', async () => {
  mockSeeded.mockResolvedValue(true);
  mockList.mockResolvedValue([]);
  const seeded = await seedDefaultCategoriesIfNeeded();
  expect(seeded).toBe(false);
  expect(mockSetSeeded).not.toHaveBeenCalled();
});

it('seeds defaults for a user who only has the migrated Uncategorized row', async () => {
  mockSeeded.mockResolvedValue(false);
  mockList.mockResolvedValue([
    { id: 'u1', name: 'Uncategorized', type: 'expense', icon: 'help-circle-outline', colorBg: '#F3F4F6', colorFg: '#6B7280', isUncategorized: true },
  ]);
  const seeded = await seedDefaultCategoriesIfNeeded();
  const names = mockInsert.mock.calls.map(([c]) => c.name);
  expect(seeded).toBe(true);
  expect(names).not.toContain('Uncategorized');
  expect(names).toContain('Food');
  expect(mockSetSeeded).toHaveBeenCalledWith(true);
});

it('does not add a second Uncategorized row', async () => {
  mockSeeded.mockResolvedValue(false);
  mockList.mockResolvedValue([
    { id: 'u1', name: 'Uncategorized', type: 'expense', icon: 'help-circle-outline', colorBg: '#F3F4F6', colorFg: '#6B7280', isUncategorized: true },
  ]);
  await seedDefaultCategoriesIfNeeded();
  expect(mockInsert.mock.calls.filter(([c]) => c.isUncategorized)).toHaveLength(0);
});

it('exports the expected default categories', () => {
  expect(DEFAULT_EXPENSE_CATEGORIES.length).toBeGreaterThan(0);
  expect(DEFAULT_INCOME_CATEGORIES.length).toBeGreaterThan(0);
});
