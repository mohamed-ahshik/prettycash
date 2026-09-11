import React, { createContext, useContext, useState } from 'react';
import { CategoryItem } from '../types';

export const DEFAULT_EXPENSE_CATEGORIES: CategoryItem[] = [
  { id: 'exp-food', name: 'Food', type: 'expense', icon: 'silverware-fork-knife', colorBg: '#FFF4D6', colorFg: '#FFB800', notes: 'Groceries & dining' },
  { id: 'exp-shopping', name: 'Shopping', type: 'expense', icon: 'bag-personal-outline', colorBg: '#E0F2FE', colorFg: '#00B4D8', notes: 'Personal items & gear' },
  { id: 'exp-drinks', name: 'Drinks', type: 'expense', icon: 'glass-wine', colorBg: '#DFF0EB', colorFg: '#2EC4B6', notes: 'Cafes & drinks' },
  { id: 'exp-travel', name: 'Travel', type: 'expense', icon: 'car-outline', colorBg: '#E8EFFD', colorFg: '#3B5BDB', notes: 'Commute & transit' },
  { id: 'exp-fun', name: 'Fun', type: 'expense', icon: 'play', colorBg: '#FFEEE3', colorFg: '#E67E22', notes: 'Movies & subscriptions' },
  { id: 'exp-bills', name: 'Bills', type: 'expense', icon: 'file-document-outline', colorBg: '#F3E8FF', colorFg: '#7C3AED', notes: 'Utilities & rent' },
];

export const DEFAULT_INCOME_CATEGORIES: CategoryItem[] = [
  { id: 'inc-salary', name: 'Salary', type: 'income', icon: 'briefcase-outline', colorBg: '#E8F5E9', colorFg: '#2E7D32', notes: 'Monthly payroll' },
  { id: 'inc-freelance', name: 'Freelance', type: 'income', icon: 'laptop', colorBg: '#E0F2FE', colorFg: '#0284C7', notes: 'Client contracts & gigs' },
  { id: 'inc-investments', name: 'Investments', type: 'income', icon: 'chart-line', colorBg: '#FEF3C7', colorFg: '#D97706', notes: 'Dividends & capital gains' },
  { id: 'inc-gifts', name: 'Gifts', type: 'income', icon: 'gift-outline', colorBg: '#FFE4E6', colorFg: '#E11D48', notes: 'Occasions & bonuses' },
];

interface CategoriesContextType {
  expenseCategories: CategoryItem[];
  incomeCategories: CategoryItem[];
  addCategory: (item: Omit<CategoryItem, 'id'>) => void;
}

const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined);

export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const [expenseCategories, setExpenseCategories] = useState<CategoryItem[]>(DEFAULT_EXPENSE_CATEGORIES);
  const [incomeCategories, setIncomeCategories] = useState<CategoryItem[]>(DEFAULT_INCOME_CATEGORIES);

  const addCategory = (item: Omit<CategoryItem, 'id'>) => {
    const newItem: CategoryItem = {
      ...item,
      id: `${item.type}-${Date.now()}`,
    };
    if (item.type === 'expense') {
      setExpenseCategories((prev) => [newItem, ...prev]);
    } else {
      setIncomeCategories((prev) => [newItem, ...prev]);
    }
  };

  return (
    <CategoriesContext.Provider value={{ expenseCategories, incomeCategories, addCategory }}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  const ctx = useContext(CategoriesContext);
  if (!ctx) {
    throw new Error('useCategories must be used within CategoriesProvider');
  }
  return ctx;
}
