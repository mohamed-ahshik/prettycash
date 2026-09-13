import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Transaction, TransactionGroup } from '../types';
import { listTransactions, insertTransaction } from '../data/repositories/transactionsRepo';
import { groupTransactionsByDay } from '../utils/groupTransactions';
import { useAuth } from './AuthContext';

interface TransactionsContextType {
  groups: TransactionGroup[];
  addTransaction: (input: Omit<Transaction, 'id'>) => void;
  loading: boolean;
  error: string | null;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

export function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;

    let cancelled = false;
    setLoading(true);

    listTransactions()
      .then((txs) => {
        if (cancelled) return;
        setTransactions(txs);
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

  const addTransaction = async (input: Omit<Transaction, 'id'>) => {
    const created = await insertTransaction(input);
    setTransactions((prev) => [created, ...prev]);
  };

  const groups = useMemo(() => groupTransactionsByDay(transactions), [transactions]);

  return (
    <TransactionsContext.Provider value={{ groups, addTransaction, loading, error }}>
      {children}
    </TransactionsContext.Provider>
  );
}

export function useTransactions() {
  const ctx = useContext(TransactionsContext);
  if (!ctx) throw new Error('useTransactions must be used within TransactionsProvider');
  return ctx;
}
