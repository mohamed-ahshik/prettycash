import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTransactions } from '../context/TransactionsContext';
import { colors, fonts } from '../theme';
import { Transaction } from '../types';
import { toReceiptDraft } from '../utils/transactionDraft';
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

  if (!transaction) {
    return null;
  }

  const handleSubmit = async (input: Omit<Transaction, 'id'>) => {
    try {
      await updateTransaction(transaction.id, input);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update transaction.');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTransaction(transaction.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete transaction.');
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.dismissOverlay} onPress={onClose} />
        <View style={styles.card}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TransactionForm
            initial={toReceiptDraft(transaction)}
            initialType={transaction.type}
            initialCategoryId={transaction.categoryId}
            initialDate={transaction.date}
            title="Edit Transaction"
            submitLabel="Save"
            onDelete={handleDelete}
            onSubmit={handleSubmit}
            onCancel={onClose}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  dismissOverlay: {
    ...StyleSheet.absoluteFill,
  },
  card: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    height: '88%',
    width: '100%',
    maxWidth: 430,
  },
  errorText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.expenseText,
    marginBottom: 8,
    textAlign: 'center',
  },
});
