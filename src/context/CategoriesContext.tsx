import React, { createContext, useContext, useEffect, useState } from 'react';
import { CategoryItem } from '../types';
import { listCategories, insertCategory } from '../data/repositories/categoriesRepo';
import { useAuth } from './AuthContext';

interface CategoriesContextType {
  expenseCategories: CategoryItem[];
  incomeCategories: CategoryItem[];
  addCategory: (item: Omit<CategoryItem, 'id'>) => void;
  loading: boolean;
  error: string | null;
}

const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined);

export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [expenseCategories, setExpenseCategories] = useState<CategoryItem[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;

    let cancelled = false;
    setLoading(true);

    listCategories()
      .then((categories) => {
        if (cancelled) return;
        setExpenseCategories(categories.filter((c) => c.type === 'expense'));
        setIncomeCategories(categories.filter((c) => c.type === 'income'));
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  const addCategory = async (item: Omit<CategoryItem, 'id'>) => {
    const created = await insertCategory(item);
    if (created.type === 'expense') {
      setExpenseCategories((prev) => [created, ...prev]);
    } else {
      setIncomeCategories((prev) => [created, ...prev]);
    }
  };

  return (
    <CategoriesContext.Provider value={{ expenseCategories, incomeCategories, addCategory, loading, error }}>
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
