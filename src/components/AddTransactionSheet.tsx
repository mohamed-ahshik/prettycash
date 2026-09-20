import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useMonth } from '../context/MonthContext';
import { useTransactions } from '../context/TransactionsContext';
import { uploadReceipt } from '../data/repositories/storageRepo';
import { hapticSuccess } from '../lib/haptics';
import { analyzeReceipt, formatAnalysisError } from '../services/receiptAnalysis';
import { colors, fonts, radii } from '../theme';
import { motion } from '../theme/motion';
import { ReceiptDraft, Transaction } from '../types';
import { monthYearFromDate } from '../utils/aggregate';
import { BottomSheet } from './BottomSheet';
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
  const [receiptData, setReceiptData] = useState<unknown>(null);
  const requestToken = useRef(0);
  const scan = useSharedValue(0);
  const scanStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scan.value * 96 }],
  }));

  useEffect(() => {
    if (flow === 'analyzing') {
      scan.value = 0;
      scan.value = withRepeat(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    }
  }, [flow, scan]);

  useEffect(() => {
    if (!visible) {
      requestToken.current += 1;
      setFlow('chooser');
      setDraft(null);
      setError(null);
      setReceiptPath(null);
      setReceiptData(null);
    }
  }, [visible]);

  const handlePicked = async (base64: string, mimeType: string) => {
    const token = ++requestToken.current;
    setFlow('analyzing');
    setDraft(null);
    setError(null);
    setReceiptPath(null);
    setReceiptData(null);

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
      const { draft: result, raw } = await analyzeReceipt(base64, mimeType);
      if (token !== requestToken.current) return;
      setDraft(result);
      setReceiptData(raw);
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
    setReceiptData(null);
    setFlow('form');
  };

  const handleSubmit = async (input: Omit<Transaction, 'id'>) => {
    try {
      await addTransaction({ ...input, receiptPath: receiptPath ?? undefined, receiptData: receiptData ?? undefined });
      const { year, month } = monthYearFromDate(input.date);
      setMonth(month, year);
      hapticSuccess();
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
    <BottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight={flow === 'form' ? 0.92 : 0.8}
      fill={flow === 'form'}
    >
      <Animated.View
        key={flow}
        style={flow === 'form' ? styles.stepFill : undefined}
        entering={FadeIn.duration(motion.duration.selection)}
      >
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
          <View style={styles.scanBox}>
            <Animated.View style={[styles.scanLine, scanStyle]} />
          </View>
          <Text style={styles.analyzingText}>Reading receipt…</Text>
          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      )}

      {flow === 'form' && (
        <View style={styles.formWrap}>
          <TransactionForm
            initial={draft ?? undefined}
            receiptDate={draft?.date}
            error={error ?? undefined}
            onSubmit={handleSubmit}
            onCancel={onClose}
          />
        </View>
      )}
      </Animated.View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
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
  scanBox: {
    width: '100%',
    height: 120,
    borderRadius: radii.md,
    backgroundColor: colors.muted,
    overflow: 'hidden',
  },
  scanLine: {
    height: 2,
    width: '100%',
    backgroundColor: colors.primary,
    opacity: 0.5,
  },
  stepFill: {
    flex: 1,
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
