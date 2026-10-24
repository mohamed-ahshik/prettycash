import React, { useEffect, useRef, useState } from 'react';
import {
  Animated as RNAnimated,
  Easing as RNEasing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useCategories } from '../context/CategoriesContext';
import { useMonth } from '../context/MonthContext';
import { useThemedStyles } from '../context/ThemeContext';
import { useTransactions } from '../context/TransactionsContext';
import { getProfile } from '../data/repositories/profileRepo';
import { uploadReceipt } from '../data/repositories/storageRepo';
import { hapticSuccess } from '../lib/haptics';
import { analyzeReceipt, formatAnalysisError } from '../services/receiptAnalysis';
import type { PickedReceiptImage } from '../services/receiptPicker';
import { fonts, radii } from '../theme';
import type { ThemeColors } from '../theme';
import { motion } from '../theme/motion';
import { ReceiptDraft, Transaction } from '../types';
import { monthYearFromDate } from '../utils/aggregate';
import { buildCategoryPayload, selectInitialCategoryId } from '../utils/categorySelection';
import { BottomSheet } from './BottomSheet';
import { TransactionForm } from './TransactionForm';

interface AddTransactionSheetProps {
  visible: boolean;
  initialImage?: PickedReceiptImage | null;
  startManual?: boolean;
  onClose: () => void;
}

type Flow = 'analyzing' | 'form';

export function AddTransactionSheet({
  visible,
  initialImage,
  startManual = false,
  onClose,
}: AddTransactionSheetProps) {
  const styles = useThemedStyles(makeStyles);
  const { addTransaction } = useTransactions();
  const { expenseCategories } = useCategories();
  const { setMonth } = useMonth();
  const [flow, setFlow] = useState<Flow>('form');
  const [draft, setDraft] = useState<ReceiptDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<unknown>(null);
  const [initialCategoryId, setInitialCategoryId] = useState<string | null>(null);
  const requestToken = useRef(0);
  const startKey = useRef<string | null>(null);
  const scanAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (flow !== 'analyzing') {
      scanAnim.stopAnimation();
      scanAnim.setValue(0);
      return;
    }
    const useNativeDriver = Platform.OS !== 'web';
    const loop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(scanAnim, {
          toValue: 1,
          duration: 1400,
          easing: RNEasing.inOut(RNEasing.quad),
          useNativeDriver,
        }),
        RNAnimated.timing(scanAnim, {
          toValue: 0,
          duration: 1400,
          easing: RNEasing.inOut(RNEasing.quad),
          useNativeDriver,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [flow, scanAnim]);

  useEffect(() => {
    if (!visible) {
      requestToken.current += 1;
      startKey.current = null;
      setFlow('form');
      setDraft(null);
      setError(null);
      setReceiptPath(null);
      setReceiptData(null);
      setInitialCategoryId(null);
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
      setInitialCategoryId(selectInitialCategoryId(null, expenseCategories) ?? null);
      setFlow('form');
      return;
    }

    let autoCategorize = true;
    try {
      const profile = await getProfile();
      autoCategorize = profile?.autoCategorize ?? true;
      if (token !== requestToken.current) return;
    } catch {
      autoCategorize = true;
    }
    const categories = buildCategoryPayload(expenseCategories);
    const shouldAutoCategorize = autoCategorize && categories.length > 0;

    try {
      const { draft: result, raw } = await analyzeReceipt(base64, mimeType, {
        autoCategorize: shouldAutoCategorize,
        categories: shouldAutoCategorize ? categories : [],
      });
      if (token !== requestToken.current) return;
      setDraft(result);
      setReceiptData(raw);
      setInitialCategoryId(selectInitialCategoryId(result, expenseCategories) ?? null);
      setError(null);
      setFlow('form');
    } catch (e) {
      if (token !== requestToken.current) return;
      setError(formatAnalysisError(e));
      setDraft(null);
      setInitialCategoryId(selectInitialCategoryId(null, expenseCategories) ?? null);
      setFlow('form');
    }
  };

  const handleManual = () => {
    setDraft(null);
    setError(null);
    setReceiptPath(null);
    setReceiptData(null);
    setInitialCategoryId(null);
    setFlow('form');
  };

  useEffect(() => {
    if (!visible) return;
    const key = initialImage ? 'image' : startManual ? 'manual' : null;
    if (!key || startKey.current === key) return;
    startKey.current = key;
    if (initialImage) {
      void handlePicked(initialImage.base64, initialImage.mimeType);
    } else {
      handleManual();
    }
  }, [visible, initialImage, startManual]);

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
      {flow === 'analyzing' && (
        <View style={styles.analyzingWrap}>
          <View style={styles.scanBox}>
            <RNAnimated.View
              style={[
                styles.scanLine,
                {
                  transform: [
                    {
                      translateY: scanAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 96],
                      }),
                    },
                  ],
                },
              ]}
            />
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
            initialCategoryId={initialCategoryId ?? undefined}
            receiptDate={draft?.date}
            error={error ?? undefined}
            autoFocusName={startManual}
            onSubmit={handleSubmit}
            onCancel={onClose}
          />
        </View>
      )}
      </Animated.View>
    </BottomSheet>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
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
});
