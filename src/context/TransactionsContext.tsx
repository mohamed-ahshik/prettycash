import React, { createContext, useContext, useMemo, useState } from 'react';
import { Transaction, TransactionGroup } from '../types';
import { groupTransactionsByDay } from '../utils/groupTransactions';
import { seedTransactions } from '../data/seedTransactions';

interface TransactionsContextType {
  groups: TransactionGroup[];
  addTransaction: (input: Omit<Transaction, 'id'>) => void;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

export function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(seedTransactions);

  const addTransaction = (input: Omit<Transaction, 'id'>) => {
    const tx: Transaction = { ...input, id: `tx-${Date.now()}` };
    setTransactions((prev) => [tx, ...prev]);
  };

  const groups = useMemo(() => groupTransactionsByDay(transactions), [transactions]);

  return (
    <TransactionsContext.Provider value={{ groups, addTransaction }}>
      {children}
    </TransactionsContext.Provider>
  );
}

export function useTransactions() {
  const ctx = useContext(TransactionsContext);
  if (!ctx) throw new Error('useTransactions must be used within TransactionsProvider');
  return ctx;
}
