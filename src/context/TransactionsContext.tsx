import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Transaction, TransactionGroup } from '../types';
import {
  listTransactions,
  insertTransaction,
  updateTransaction as updateTransactionRepo,
  deleteTransaction as deleteTransactionRepo,
} from '../data/repositories/transactionsRepo';
import { posthog } from '../lib/posthog';
import { groupTransactionsByDay } from '../utils/groupTransactions';
import { useAuth } from './AuthContext';

interface TransactionsContextType {
  transactions: Transaction[];
  groups: TransactionGroup[];
  addTransaction: (input: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, input: Omit<Transaction, 'id'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
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
    posthog?.capture('transaction_created', {
      transaction_type: input.type,
      item_count: input.items?.length ?? 0,
      has_receipt: Boolean(input.receiptPath),
    });
  };

  const updateTransaction = async (id: string, input: Omit<Transaction, 'id'>) => {
    const updated = await updateTransactionRepo(id, input);
    setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)));
    posthog?.capture('transaction_updated', {
      transaction_type: input.type,
      item_count: input.items?.length ?? 0,
      has_receipt: Boolean(input.receiptPath),
    });
  };

  const deleteTransaction = async (id: string) => {
    await deleteTransactionRepo(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    posthog?.capture('transaction_deleted');
  };

  const groups = useMemo(() => groupTransactionsByDay(transactions), [transactions]);

  return (
    <TransactionsContext.Provider
      value={{ transactions, groups, addTransaction, updateTransaction, deleteTransaction, loading, error }}
    >
      {children}
    </TransactionsContext.Provider>
  );
}

export function useTransactions() {
  const ctx = useContext(TransactionsContext);
  if (!ctx) throw new Error('useTransactions must be used within TransactionsProvider');
  return ctx;
}
