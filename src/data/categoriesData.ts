import { CategoryItem, PresetColor } from '../types';

export const PRESET_CATEGORY_COLORS: PresetColor[] = [
  { bg: '#DFF0EB', fg: '#00674F' },
  { bg: '#E8EFFD', fg: '#3B5BDB' },
  { bg: '#FFEEE3', fg: '#E67E22' },
  { bg: '#FFF4D6', fg: '#9C7A00' },
  { bg: '#E8F5E9', fg: '#2E7D32' },
  { bg: '#F3E8FF', fg: '#7C3AED' },
  { bg: '#FCE7F3', fg: '#DB2777' },
  { bg: '#E0F2FE', fg: '#0284C7' },
];

export const PRESET_CATEGORY_ICONS: string[] = [
  'cart-outline',
  'car-outline',
  'coffee-outline',
  'play',
  'file-document-outline',
  'bag-personal-outline',
  'briefcase-outline',
  'laptop',
  'chart-line',
  'gift-outline',
  'home-outline',
  'medical-bag',
];

export const INITIAL_EXPENSE_CATEGORIES: CategoryItem[] = [
  { id: 'exp-1', name: 'Food', type: 'expense', icon: 'cart-outline', colorBg: '#DFF0EB', colorFg: '#00674F', notes: 'Groceries & dining' },
  { id: 'exp-2', name: 'Travel', type: 'expense', icon: 'car-outline', colorBg: '#E8EFFD', colorFg: '#3B5BDB', notes: 'Commute & transit' },
  { id: 'exp-3', name: 'Fun', type: 'expense', icon: 'play', colorBg: '#FFEEE3', colorFg: '#E67E22', notes: 'Movies & subscriptions' },
  { id: 'exp-4', name: 'Coffee', type: 'expense', icon: 'coffee-outline', colorBg: '#FFF4D6', colorFg: '#9C7A00', notes: 'Cafes & quick bites' },
  { id: 'exp-5', name: 'Bills', type: 'expense', icon: 'file-document-outline', colorBg: '#F3E8FF', colorFg: '#7C3AED', notes: 'Utilities & rent' },
  { id: 'exp-6', name: 'Shopping', type: 'expense', icon: 'bag-personal-outline', colorBg: '#FCE7F3', colorFg: '#DB2777', notes: 'Personal items & gear' },
];

export const INITIAL_INCOME_CATEGORIES: CategoryItem[] = [
  { id: 'inc-1', name: 'Salary', type: 'income', icon: 'briefcase-outline', colorBg: '#E8F5E9', colorFg: '#2E7D32', notes: 'Monthly payroll' },
  { id: 'inc-2', name: 'Freelance', type: 'income', icon: 'laptop', colorBg: '#E0F2FE', colorFg: '#0284C7', notes: 'Client contracts & gigs' },
  { id: 'inc-3', name: 'Investments', type: 'income', icon: 'chart-line', colorBg: '#FEF3C7', colorFg: '#D97706', notes: 'Dividends & capital gains' },
  { id: 'inc-4', name: 'Gifts', type: 'income', icon: 'gift-outline', colorBg: '#FFE4E6', colorFg: '#E11D48', notes: 'Occasions & bonuses' },
];
