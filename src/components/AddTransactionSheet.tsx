import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMonth } from '../context/MonthContext';
import { useTransactions } from '../context/TransactionsContext';
import { uploadReceipt } from '../data/repositories/storageRepo';
import { analyzeReceipt, formatAnalysisError } from '../services/receiptAnalysis';
import { colors, fonts, radii } from '../theme';
import { ReceiptDraft, Transaction } from '../types';
import { monthYearFromDate } from '../utils/aggregate';
import { Icon } from './Icon';
import { ReceiptImagePicker } from './ReceiptImagePicker';
import { TransactionForm } from './TransactionForm';

interface AddTransactionSheetProps {
  visible: boolean;
  onClose: () => void;
}

type Flow = 'chooser' | 'capture' | 'analyzing' | 'form';

export function AddTransactionSheet({ visible, onClose }: AddTransactionSheetProps) {
  const { addTransaction } = useTransactions();
  const { setMonth } = useMonth();
  const [flow, setFlow] = useState<Flow>('chooser');
  const [draft, setDraft] = useState<ReceiptDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const requestToken = useRef(0);

  useEffect(() => {
    if (!visible) {
      requestToken.current += 1;
      setFlow('chooser');
      setDraft(null);
      setError(null);
      setReceiptPath(null);
    }
  }, [visible]);

  const handlePicked = async (base64: string, mimeType: string) => {
    const token = ++requestToken.current;
    setFlow('analyzing');
    setDraft(null);
    setError(null);
    setReceiptPath(null);

    try {
      const path = await uploadReceipt(base64, mimeType);
      if (token !== requestToken.current) return;
      setReceiptPath(path);
    } catch (e) {
      if (token !== requestToken.current) return;
      setError(e instanceof Error ? e.message : 'Receipt upload failed.');
      setFlow('form');
      return;
    }

    try {
      const result = await analyzeReceipt(base64, mimeType);
      if (token !== requestToken.current) return;
      setDraft(result);
      setError(null);
      setFlow('form');
    } catch (e) {
      if (token !== requestToken.current) return;
      setError(formatAnalysisError(e));
      setDraft(null);
      setFlow('form');
    }
  };

  const handleManual = () => {
    setDraft(null);
    setError(null);
    setReceiptPath(null);
    setFlow('form');
  };

  const handleSubmit = async (input: Omit<Transaction, 'id'>) => {
    try {
      await addTransaction({ ...input, receiptPath: receiptPath ?? undefined });
      const { year, month } = monthYearFromDate(input.date);
      setMonth(month, year);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save transaction.');
    }
  };

  const renderHeader = (title: string, subtitle?: string) => (
    <View style={styles.header}>
      <View>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Pressable style={styles.closeButton} onPress={onClose}>
        <Icon name="close" size={20} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.dismissOverlay} onPress={onClose} />
        <View style={[styles.modalCard, flow === 'form' && styles.formCard]}>
          {flow === 'chooser' && (
            <View style={styles.body}>
              {renderHeader('Add Transaction', 'How would you like to add it?')}
              <Pressable style={styles.optionButton} onPress={() => setFlow('capture')}>
                <View style={styles.optionIcon}>
                  <Icon name="camera" size={22} color={colors.primary} />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionTitle}>Scan receipt</Text>
                  <Text style={styles.optionSubtitle}>Use AI to fill in the details</Text>
                </View>
                <Icon name="chevron-right" size={22} color={colors.mutedForeground} />
              </Pressable>
              <Pressable style={styles.optionButton} onPress={handleManual}>
                <View style={styles.optionIcon}>
                  <Icon name="pencil" size={22} color={colors.primary} />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionTitle}>Enter manually</Text>
                  <Text style={styles.optionSubtitle}>Type the details yourself</Text>
                </View>
                <Icon name="chevron-right" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>
          )}

          {flow === 'capture' && (
            <View style={styles.body}>
              {renderHeader('Scan Receipt', 'Take a photo or choose from your library')}
              <ReceiptImagePicker
                onPicked={handlePicked}
                onCancel={() => setFlow('chooser')}
              />
            </View>
          )}

          {flow === 'analyzing' && (
            <View style={styles.analyzingWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.analyzingText}>Reading receipt…</Text>
              <Pressable style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
            </View>
          )}

          {flow === 'form' && (
            <View style={styles.formWrap}>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <TransactionForm
                initial={draft ?? undefined}
                onSubmit={handleSubmit}
                onCancel={onClose}
              />
            </View>
          )}
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
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    maxHeight: '85%',
    width: '100%',
    maxWidth: 430,
  },
  formCard: {
    height: '88%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.foreground,
  },
  subtitle: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: colors.muted,
  },
  body: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  optionIcon: {
    height: 42,
    width: 42,
    borderRadius: 21,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: fonts.semibold,
    color: colors.foreground,
  },
  optionSubtitle: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  analyzingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  analyzingText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: fonts.semibold,
    color: colors.mutedForeground,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radii.pill,
    backgroundColor: colors.muted,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: fonts.semibold,
    color: colors.foreground,
  },
  formWrap: {
    flex: 1,
  },
  errorText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.expenseText,
    marginBottom: 8,
    textAlign: 'center',
  },
});
