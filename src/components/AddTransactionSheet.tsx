import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useCategories } from '../context/CategoriesContext';
import { useMonth } from '../context/MonthContext';
import { useTransactions } from '../context/TransactionsContext';
import { getProfile } from '../data/repositories/profileRepo';
import { uploadReceipt } from '../data/repositories/storageRepo';
import { hapticSuccess } from '../lib/haptics';
import { posthog } from '../lib/posthog';
import {
  analyzeReceipt,
  ReceiptAnalysisError,
  resumeReceiptAnalysis,
} from '../services/receiptAnalysis';
import type { PickedReceiptImage } from '../services/receiptPicker';
import { motion } from '../theme/motion';
import { ReceiptDraft, Transaction } from '../types';
import { monthYearFromDate } from '../utils/aggregate';
import { buildCategoryPayload, selectInitialCategoryId } from '../utils/categorySelection';
import { createId } from '../utils/ids';
import { AnalysisErrorCard } from './AnalysisErrorCard';
import type { AnalysisErrorAction, AnalysisErrorKind } from './AnalysisErrorCard';
import { AnalysisProgress } from './AnalysisProgress';
import type { AnalysisStage } from './AnalysisProgress';
import { BottomSheet } from './BottomSheet';
import { TransactionForm } from './TransactionForm';

interface AddTransactionSheetProps {
  visible: boolean;
  initialImage?: PickedReceiptImage | null;
  startManual?: boolean;
  onClose: () => void;
  onRetake?: () => void;
  onChoosePhoto?: () => void;
}

type Flow = 'analyzing' | 'error' | 'form';

interface AnalysisAttempt {
  captureId: string;
  requestId: string;
  jobId?: string;
  jobStartedAt?: number;
  image: PickedReceiptImage;
  receiptPath?: string;
}

const FINISHING_AFTER_MS = 6000;
const SLOW_WAIT_AFTER_MS = 15000;

export function AddTransactionSheet({
  visible,
  initialImage,
  startManual = false,
  onClose,
  onRetake,
  onChoosePhoto,
}: AddTransactionSheetProps) {
  const { addTransaction } = useTransactions();
  const { expenseCategories } = useCategories();
  const { setMonth } = useMonth();
  const [flow, setFlow] = useState<Flow>('form');
  const [draft, setDraft] = useState<ReceiptDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<unknown>(null);
  const [initialCategoryId, setInitialCategoryId] = useState<string | null>(null);
  const [stage, setStage] = useState<AnalysisStage>('sending');
  const [slowWait, setSlowWait] = useState(false);
  const [analysisErrorKind, setAnalysisErrorKind] = useState<AnalysisErrorKind | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const requestToken = useRef(0);
  const startKey = useRef<string | null>(null);
  const startingRef = useRef(false);
  const attemptRef = useRef<AnalysisAttempt | null>(null);
  const timelineTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimelineTimers = () => {
    timelineTimers.current.forEach((timer) => clearTimeout(timer));
    timelineTimers.current = [];
  };

  const scheduleTimeline = (attempt: AnalysisAttempt) => {
    if (attempt.jobStartedAt == null) return;
    clearTimelineTimers();
    const elapsed = Math.max(0, Date.now() - attempt.jobStartedAt);
    setStage(elapsed >= FINISHING_AFTER_MS ? 'finishing' : 'reading');
    setSlowWait(elapsed >= SLOW_WAIT_AFTER_MS);

    const finishingIn = FINISHING_AFTER_MS - elapsed;
    if (finishingIn > 0) {
      timelineTimers.current.push(setTimeout(() => setStage('finishing'), finishingIn));
    }
    const slowWaitIn = SLOW_WAIT_AFTER_MS - elapsed;
    if (slowWaitIn > 0) {
      timelineTimers.current.push(setTimeout(() => setSlowWait(true), slowWaitIn));
    }
  };

  const beginAnalyzing = (attempt: AnalysisAttempt, resume: boolean) => {
    clearTimelineTimers();
    setFlow('analyzing');
    setDraft(null);
    setError(null);
    setReceiptData(null);
    setInitialCategoryId(null);
    setAnalysisErrorKind(null);
    setReconnecting(false);
    setReceiptPath(attempt.receiptPath ?? null);

    if (resume) {
      if (attempt.jobStartedAt == null) attempt.jobStartedAt = Date.now();
      scheduleTimeline(attempt);
    } else {
      attempt.jobStartedAt = undefined;
      setStage('sending');
      setSlowWait(false);
    }
  };

  const failAnalysis = (attempt: AnalysisAttempt, e: unknown) => {
    const analysisError = e instanceof ReceiptAnalysisError ? e : null;
    if (analysisError?.jobId) attempt.jobId = analysisError.jobId;
    clearTimelineTimers();
    setReconnecting(false);
    setDraft(null);
    setReceiptData(null);
    setInitialCategoryId(null);
    setError(null);

    let kind: AnalysisErrorKind;
    if (analysisError?.code === 'NOT_A_RECEIPT') {
      kind = 'rejected';
    } else if (analysisError?.code === 'FAILED') {
      kind = 'failed';
    } else if (analysisError?.code === 'TIMEOUT' && analysisError.jobId) {
      kind = 'timeout';
    } else if (analysisError?.phase === 'poll') {
      kind = 'poll';
    } else {
      kind = 'enqueue';
    }
    posthog?.capture('receipt_analysis_failed', { failure_stage: kind });
    setAnalysisErrorKind(kind);
    setFlow('error');
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
              if (token !== requestToken.current) return;
              attempt.jobId = jobId;
              if (attempt.jobStartedAt == null) attempt.jobStartedAt = Date.now();
              scheduleTimeline(attempt);
            },
            onPollRetry,
          });
      if (token !== requestToken.current) return;
      clearTimelineTimers();
      setReconnecting(false);
      setDraft(result.draft);
      setReceiptData(result.raw);
      setInitialCategoryId(selectInitialCategoryId(result.draft, expenseCategories) ?? null);
      posthog?.capture('receipt_analysis_completed', {
        item_count: result.draft.items.length,
        auto_categorization_enabled: shouldAutoCategorize,
      });
      setError(null);
      setFlow('form');
    } catch (e) {
      if (token !== requestToken.current) return;
      failAnalysis(attempt, e);
    }
  };

  const runCapture = async (attempt: AnalysisAttempt) => {
    const token = ++requestToken.current;
    beginAnalyzing(attempt, false);
    try {
      const path = await uploadReceipt(
        attempt.image.base64,
        attempt.image.mimeType,
        attempt.captureId,
      );
      if (token !== requestToken.current) return;
      attempt.receiptPath = path;
      setReceiptPath(path);
    } catch {
      if (token !== requestToken.current) return;
      clearTimelineTimers();
      setReconnecting(false);
      setDraft(null);
      setReceiptData(null);
      setInitialCategoryId(null);
      setError(null);
      posthog?.capture('receipt_analysis_failed', { failure_stage: 'upload' });
      setAnalysisErrorKind('upload');
      setFlow('error');
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
      beginAnalyzing(attempt, resume);
      await runAnalysis(attempt, token, resume);
    } finally {
      startingRef.current = false;
    }
  };

  const handleManual = () => {
    requestToken.current += 1;
    clearTimelineTimers();
    attemptRef.current = null;
    setAnalysisErrorKind(null);
    setStage('sending');
    setSlowWait(false);
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

  const handleChoosePhoto = () => {
    if (onChoosePhoto) onChoosePhoto();
    else onClose();
  };

  const handleErrorAction = (action: AnalysisErrorAction) => {
    if (action === 'scan-again') {
      handleRetake();
      return;
    }
    if (action === 'choose-photo') {
      handleChoosePhoto();
      return;
    }
    if (action === 'enter-manually') {
      handleManual();
      return;
    }

    const attempt = attemptRef.current;
    if (!attempt || startingRef.current) return;

    switch (action) {
      case 'retry-upload':
      case 'retry-analysis':
        void beginAttempt(attempt, false);
        return;
      case 'retry-checking':
      case 'keep-checking':
        void beginAttempt(attempt, true);
        return;
      case 'start-over':
      case 'try-again':
        attempt.requestId = createId();
        attempt.jobId = undefined;
        attempt.jobStartedAt = undefined;
        void beginAttempt(attempt, false);
        return;
    }
  };

  useEffect(() => {
    if (!visible) {
      requestToken.current += 1;
      startKey.current = null;
      startingRef.current = false;
      attemptRef.current = null;
      clearTimelineTimers();
      setFlow('form');
      setDraft(null);
      setError(null);
      setReceiptPath(null);
      setReceiptData(null);
      setInitialCategoryId(null);
      setStage('sending');
      setSlowWait(false);
      setAnalysisErrorKind(null);
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

  useEffect(() => {
    return () => clearTimelineTimers();
  }, []);

  const handleSubmit = async (input: Omit<Transaction, 'id'>) => {
    try {
      await addTransaction({
        ...input,
        receiptPath: receiptPath ?? undefined,
        receiptData: receiptData ?? undefined,
      });
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
      maxHeight={flow === 'analyzing' ? 0.8 : 0.92}
      fill={flow === 'form'}
    >
      <Animated.View
        key={flow}
        style={flow === 'form' ? styles.stepFill : undefined}
        entering={FadeIn.duration(motion.duration.selection)}
      >
        {flow === 'analyzing' && attemptRef.current ? (
          <AnalysisProgress
            image={attemptRef.current.image}
            stage={stage}
            slowWait={slowWait}
            reconnecting={reconnecting}
            onCancel={onClose}
          />
        ) : null}

        {flow === 'error' && analysisErrorKind && attemptRef.current ? (
          <AnalysisErrorCard
            kind={analysisErrorKind}
            image={attemptRef.current.image}
            onAction={handleErrorAction}
            onClose={onClose}
          />
        ) : null}

        {flow === 'form' ? (
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
        ) : null}
      </Animated.View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  stepFill: {
    flex: 1,
  },
  formWrap: {
    flex: 1,
  },
});
