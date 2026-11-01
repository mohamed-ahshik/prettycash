import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  listPendingRecurringOccurrences,
  resolveRecurringOccurrence,
} from '../data/repositories/recurringOccurrencesRepo';
import { getRecurringOccurrenceId } from '../lib/notifications';
import { useAuth } from './AuthContext';
import { useTransactions } from './TransactionsContext';
import { RecurringConfirmationModal } from '../components/RecurringConfirmationModal';
import type { RecurringOccurrence } from '../types';

export function PendingRecurringProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { refreshTransactions } = useTransactions();
  const [pending, setPending] = useState<RecurringOccurrence[]>([]);
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);

  const refreshPending = useCallback(async () => {
    if (!session) {
      setPending([]);
      return;
    }
    try {
      const next = await listPendingRecurringOccurrences();
      setPending(next);
    } catch {
      // A pending confirmation must never block the app.
    }
  }, [session]);

  useEffect(() => {
    void refreshPending();
  }, [refreshPending]);

  useEffect(() => {
    if (!session) return;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setHidden(false);
        void refreshPending();
      }
    });

    return () => subscription.remove();
  }, [session, refreshPending]);

  useEffect(() => {
    if (!session || Platform.OS === 'web') return;

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      if (getRecurringOccurrenceId(response)) {
        setHidden(false);
        void refreshPending();
      }
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response && getRecurringOccurrenceId(response)) {
        setHidden(false);
        void refreshPending();
      }
    });

    return () => subscription.remove();
  }, [session, refreshPending]);

  const resolve = async (decision: 'post' | 'skip') => {
    const current = pending[0];
    if (!current || busy) return;

    setBusy(true);
    try {
      await resolveRecurringOccurrence(current.id, decision);
      await refreshTransactions();
      await refreshPending();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {children}
      <RecurringConfirmationModal
        occurrence={hidden ? null : (pending[0] ?? null)}
        busy={busy}
        onPost={() => void resolve('post')}
        onSkip={() => void resolve('skip')}
        onLater={() => setHidden(true)}
      />
    </>
  );
}
