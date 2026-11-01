import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { fonts, radii, shadows, text } from '../theme';
import type { ThemeColors } from '../theme';
import { RecurringOccurrence } from '../types';
import { formatSignedAmount } from '../utils/format';

interface RecurringConfirmationModalProps {
  occurrence: RecurringOccurrence | null;
  busy: boolean;
  onPost: () => void;
  onSkip: () => void;
  onLater: () => void;
}

function formatMonthDay(date: string): { month: string; day: number; lastDay: number } {
  const [year, month, day] = date.split('-').map(Number);
  const monthLabel = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    timeZone: 'UTC',
  });
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { month: monthLabel, day, lastDay };
}

export function RecurringConfirmationModal({
  occurrence,
  busy,
  onPost,
  onSkip,
  onLater,
}: RecurringConfirmationModalProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { symbol, decimals } = useCurrency();

  if (!occurrence) return null;

  const { month, day, lastDay } = formatMonthDay(occurrence.occurrenceDate);
  const item = occurrence.item;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onLater}>
      <Pressable style={styles.backdrop} onPress={onLater}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={[text.overline, styles.eyebrow]}>Recurring transaction</Text>
          <Text style={styles.title}>
            {month} has {lastDay} days
          </Text>
          <Text style={styles.body}>
            {item.name} is set for day {item.dayOfMonth}. Add it on {month} {day} instead, or
            skip this month.
          </Text>

          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Amount</Text>
            <Text style={[styles.amount, { color: item.type === 'income' ? colors.incomeText : colors.foreground }]}>
              {formatSignedAmount(item.type, item.amount, symbol, decimals)}
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
              busy && styles.disabled,
            ]}
            disabled={busy}
            onPress={onPost}
          >
            <Text style={styles.primaryButtonText}>Add on {month} {day}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
            disabled={busy}
            onPress={onSkip}
          >
            <Text style={styles.skipButtonText}>Skip this month</Text>
          </Pressable>
          <Pressable style={styles.laterButton} disabled={busy} onPress={onLater}>
            <Text style={styles.laterButtonText}>Not now</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    ...shadows.e1,
  },
  eyebrow: {
    color: colors.primary,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: fonts.bold,
    color: colors.foreground,
    letterSpacing: -0.4,
  },
  body: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.regular,
    color: colors.mutedForeground,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  amountLabel: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.mutedForeground,
  },
  amount: {
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.primaryForeground,
  },
  skipButton: {
    marginTop: 8,
    borderRadius: radii.pill,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: colors.muted,
  },
  skipButtonText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.foreground,
  },
  laterButton: {
    marginTop: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  laterButtonText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.mutedForeground,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.55,
  },
});
