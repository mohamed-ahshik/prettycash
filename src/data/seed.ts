import { CategoryItem } from '../types';
import { isSeeded, setSeeded } from './repositories/profileRepo';
import { insertCategory, listCategories } from './repositories/categoriesRepo';

export const DEFAULT_EXPENSE_CATEGORIES: Omit<CategoryItem, 'id'>[] = [
  { name: 'Food', type: 'expense', icon: 'silverware-fork-knife', colorBg: '#FFF4D6', colorFg: '#FFB800', notes: 'Groceries & dining' },
  { name: 'Shopping', type: 'expense', icon: 'bag-personal-outline', colorBg: '#E0F2FE', colorFg: '#00B4D8', notes: 'Personal items & gear' },
  { name: 'Drinks', type: 'expense', icon: 'glass-wine', colorBg: '#DFF0EB', colorFg: '#2EC4B6', notes: 'Cafes & drinks' },
  { name: 'Travel', type: 'expense', icon: 'car-outline', colorBg: '#E8EFFD', colorFg: '#3B5BDB', notes: 'Commute & transit' },
  { name: 'Fun', type: 'expense', icon: 'play', colorBg: '#FFEEE3', colorFg: '#E67E22', notes: 'Movies & subscriptions' },
  { name: 'Bills', type: 'expense', icon: 'file-document-outline', colorBg: '#F3E8FF', colorFg: '#7C3AED', notes: 'Utilities & rent' },
  { name: 'Uncategorized', type: 'expense', icon: 'help-circle-outline', colorBg: '#F3F4F6', colorFg: '#6B7280', notes: 'Receipts with no clear category', isUncategorized: true },
];

export const DEFAULT_INCOME_CATEGORIES: Omit<CategoryItem, 'id'>[] = [
  { name: 'Salary', type: 'income', icon: 'briefcase-outline', colorBg: '#E8F5E9', colorFg: '#2E7D32', notes: 'Monthly payroll' },
  { name: 'Freelance', type: 'income', icon: 'laptop', colorBg: '#E0F2FE', colorFg: '#0284C7', notes: 'Client contracts & gigs' },
  { name: 'Investments', type: 'income', icon: 'chart-line', colorBg: '#FEF3C7', colorFg: '#D97706', notes: 'Dividends & capital gains' },
  { name: 'Gifts', type: 'income', icon: 'gift-outline', colorBg: '#FFE4E6', colorFg: '#E11D48', notes: 'Occasions & bonuses' },
];

export async function seedDefaultCategoriesIfNeeded(): Promise<boolean> {
  if (await isSeeded()) return false;
  const existing = await listCategories();
  const hasUncategorized = existing.some((c) => c.isUncategorized);
  const all: Omit<CategoryItem, 'id'>[] = [
    ...DEFAULT_EXPENSE_CATEGORIES,
    ...DEFAULT_INCOME_CATEGORIES,
  ];
  let inserted = false;
  for (const cat of all) {
    if (cat.isUncategorized && hasUncategorized) continue;
    if (existing.some((c) => c.type === cat.type && c.name === cat.name)) continue;
    await insertCategory(cat);
    inserted = true;
  }
  await setSeeded(true);
  return inserted;
}
