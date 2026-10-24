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
import {
  analyzeReceipt,
  formatAnalysisError,
  ReceiptAnalysisError,
  resumeReceiptAnalysis,
} from '../services/receiptAnalysis';
import type { PickedReceiptImage } from '../services/receiptPicker';
import { fonts, radii } from '../theme';
import type { ThemeColors } from '../theme';
import { motion } from '../theme/motion';
import { ReceiptDraft, Transaction } from '../types';
import { monthYearFromDate } from '../utils/aggregate';
import { buildCategoryPayload, selectInitialCategoryId } from '../utils/categorySelection';
import { createId } from '../utils/ids';
import { AnalysisRetryBar } from './AnalysisRetryBar';
import type { AnalysisRetryKind } from './AnalysisRetryBar';
import { BottomSheet } from './BottomSheet';
import { TransactionForm } from './TransactionForm';

interface AddTransactionSheetProps {
  visible: boolean;
  initialImage?: PickedReceiptImage | null;
  startManual?: boolean;
  onClose: () => void;
  onRetake?: () => void;
}

type Flow = 'analyzing' | 'form';

interface AnalysisAttempt {
  captureId: string;
  requestId: string;
  jobId?: string;
  image: PickedReceiptImage;
  receiptPath?: string;
}

interface RetryState {
  kind: AnalysisRetryKind;
}

export function AddTransactionSheet({
  visible,
  initialImage,
  startManual = false,
  onClose,
  onRetake,
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
  const [retryState, setRetryState] = useState<RetryState | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const requestToken = useRef(0);
  const startKey = useRef<string | null>(null);
  const startingRef = useRef(false);
  const attemptRef = useRef<AnalysisAttempt | null>(null);
  const scanAnim = useRef(new RNAnimated.Value(0)).current;

  const beginAnalyzing = (attempt: AnalysisAttempt) => {
    setFlow('analyzing');
    setDraft(null);
    setError(null);
    setReceiptData(null);
    setInitialCategoryId(null);
    setRetryState(null);
    setReconnecting(false);
    setReceiptPath(attempt.receiptPath ?? null);
  };

  const failAnalysis = (attempt: AnalysisAttempt, e: unknown) => {
    const analysisError = e instanceof ReceiptAnalysisError ? e : null;
    if (analysisError?.jobId) attempt.jobId = analysisError.jobId;
    setReconnecting(false);
    setError(formatAnalysisError(e));
    setDraft(null);
    setReceiptData(null);
    setInitialCategoryId(selectInitialCategoryId(null, expenseCategories) ?? null);
    if (analysisError?.code === 'NOT_A_RECEIPT') {
      setRetryState({ kind: 'rejected' });
    } else if (analysisError?.code === 'FAILED') {
      setRetryState({ kind: 'failed' });
    } else if (analysisError?.code === 'TIMEOUT' && analysisError.jobId) {
      setRetryState({ kind: 'timeout' });
    } else if (analysisError?.phase === 'poll' && analysisError.jobId) {
      setRetryState({ kind: 'poll' });
    } else {
      setRetryState({ kind: 'enqueue' });
    }
    setFlow('form');
  };

  const runAnalysis = async (
    attempt: AnalysisAttempt,
    token: number,
    resume: boolean,
  ) => {
    let shouldAutoCategorize = false;
    let categories: ReturnType<typeof buildCategoryPayload> = [];

    if (!resume) {
      let autoCategorize = true;
      try {
        const profile = await getProfile();
        autoCategorize = profile?.autoCategorize ?? true;
        if (token !== requestToken.current) return;
      } catch {
        autoCategorize = true;
        if (token !== requestToken.current) return;
      }
      categories = buildCategoryPayload(expenseCategories);
      shouldAutoCategorize = autoCategorize && categories.length > 0;
    }

    const onPollRetry = (retrying: boolean) => {
      if (token === requestToken.current) setReconnecting(retrying);
    };

    try {
      const result = resume && attempt.jobId
        ? await resumeReceiptAnalysis(attempt.jobId, { onPollRetry })
        : await analyzeReceipt(attempt.image.base64, attempt.image.mimeType, {
            requestId: attempt.requestId,
            autoCategorize: shouldAutoCategorize,
            categories: shouldAutoCategorize ? categories : [],
            onJobId: (jobId) => {
              attempt.jobId = jobId;
            },
            onPollRetry,
          });
      if (token !== requestToken.current) return;
      setReconnecting(false);
      setDraft(result.draft);
      setReceiptData(result.raw);
      setInitialCategoryId(selectInitialCategoryId(result.draft, expenseCategories) ?? null);
      setError(null);
      setRetryState(null);
      setFlow('form');
    } catch (e) {
      if (token !== requestToken.current) return;
      failAnalysis(attempt, e);
    }
  };

  const runCapture = async (attempt: AnalysisAttempt) => {
    const token = ++requestToken.current;
    beginAnalyzing(attempt);
    try {
      const path = await uploadReceipt(
        attempt.image.base64,
        attempt.image.mimeType,
        attempt.captureId,
      );
      if (token !== requestToken.current) return;
      attempt.receiptPath = path;
      setReceiptPath(path);
    } catch (e) {
      if (token !== requestToken.current) return;
      setError(e instanceof Error ? e.message : 'Receipt upload failed.');
      setInitialCategoryId(selectInitialCategoryId(null, expenseCategories) ?? null);
      setRetryState({ kind: 'enqueue' });
      setFlow('form');
      return;
    }
    await runAnalysis(attempt, token, false);
  };

  const beginAttempt = async (attempt: AnalysisAttempt, resume: boolean) => {
    if (startingRef.current) return;
    startingRef.current = true;
    try {
      if (!resume && !attempt.receiptPath) {
        await runCapture(attempt);
        return;
      }
      const token = ++requestToken.current;
      beginAnalyzing(attempt);
      await runAnalysis(attempt, token, resume);
    } finally {
      startingRef.current = false;
    }
  };

  const handleManual = () => {
    requestToken.current += 1;
    attemptRef.current = null;
    setRetryState(null);
    setReconnecting(false);
    setDraft(null);
    setError(null);
    setReceiptPath(null);
    setReceiptData(null);
    setInitialCategoryId(null);
    setFlow('form');
  };

  const handleRetake = () => {
    if (onRetake) onRetake();
    else onClose();
  };

  const handleRetryPrimary = () => {
    const attempt = attemptRef.current;
    if (!attempt || !retryState || startingRef.current) return;
    switch (retryState.kind) {
      case 'enqueue':
        void beginAttempt(attempt, false);
        return;
      case 'poll':
        void beginAttempt(attempt, true);
        return;
      case 'timeout':
        void beginAttempt(attempt, true);
        return;
      case 'failed':
        attempt.requestId = createId();
        attempt.jobId = undefined;
        void beginAttempt(attempt, false);
        return;
      case 'rejected':
        handleRetake();
        return;
    }
  };

  const handleRetrySecondary = () => {
    const attempt = attemptRef.current;
    if (!retryState || startingRef.current) return;
    if (retryState.kind === 'timeout') {
      if (!attempt) return;
      attempt.requestId = createId();
      attempt.jobId = undefined;
      void beginAttempt(attempt, false);
      return;
    }
    if (retryState.kind === 'failed') {
      handleRetake();
      return;
    }
    if (retryState.kind === 'rejected') {
      handleManual();
      return;
    }
    onClose();
  };

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
      startingRef.current = false;
      attemptRef.current = null;
      setFlow('form');
      setDraft(null);
      setError(null);
      setReceiptPath(null);
      setReceiptData(null);
      setInitialCategoryId(null);
      setRetryState(null);
      setReconnecting(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const key = initialImage ? 'image' : startManual ? 'manual' : null;
    if (!key || startKey.current === key) return;
    startKey.current = key;
    if (initialImage) {
      const attempt: AnalysisAttempt = {
        captureId: createId(),
        requestId: createId(),
        image: initialImage,
      };
      attemptRef.current = attempt;
      void beginAttempt(attempt, false);
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
          {reconnecting ? (
            <Text style={styles.reconnectNote}>Connection lost — retrying…</Text>
          ) : null}
          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      )}

      {flow === 'form' && (
        <View style={styles.formWrap}>
          {retryState ? (
            <AnalysisRetryBar
              kind={retryState.kind}
              onPrimary={handleRetryPrimary}
              onSecondary={handleRetrySecondary}
            />
          ) : null}
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
  reconnectNote: {
    fontSize: 12,
    fontFamily: fonts.regular,
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
