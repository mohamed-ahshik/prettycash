import React, { useEffect, useState } from 'react';
import { useTransactions } from '../context/TransactionsContext';
import { hapticSuccess, hapticWarning } from '../lib/haptics';
import { Transaction } from '../types';
import { toReceiptDraft } from '../utils/transactionDraft';
import { BottomSheet } from './BottomSheet';
import { TransactionForm } from './TransactionForm';

interface EditTransactionSheetProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export function EditTransactionSheet({ transaction, onClose }: EditTransactionSheetProps) {
  const { updateTransaction, deleteTransaction } = useTransactions();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [transaction]);

  const handleSubmit = async (input: Omit<Transaction, 'id'>) => {
    if (!transaction) return;
    try {
      await updateTransaction(transaction.id, input);
      hapticSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update transaction.');
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;
    try {
      hapticWarning();
      await deleteTransaction(transaction.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete transaction.');
    }
  };

  return (
    <BottomSheet visible={transaction !== null} onClose={onClose} maxHeight={0.9} fill>
      {transaction ? (
        <TransactionForm
          initial={toReceiptDraft(transaction)}
          initialType={transaction.type}
          initialCategoryId={transaction.categoryId}
          initialDate={transaction.date}
          title="Edit Transaction"
          submitLabel="Save"
          error={error ?? undefined}
          onDelete={handleDelete}
          onSubmit={handleSubmit}
          onCancel={onClose}
        />
      ) : null}
    </BottomSheet>
  );
}
