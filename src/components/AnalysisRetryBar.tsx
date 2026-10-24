import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '../context/ThemeContext';
import { fonts, radii } from '../theme';
import type { ThemeColors } from '../theme';

export type AnalysisRetryKind = 'enqueue' | 'poll' | 'timeout' | 'failed' | 'rejected';

interface RetryCopy {
  title: string;
  body: string;
  primary: string;
  secondary: string;
}

const COPY: Record<AnalysisRetryKind, RetryCopy> = {
  enqueue: {
    title: "Analysis didn't start",
    body: 'The receipt is still on this device. Retry starting the analysis.',
    primary: 'Retry analysis',
    secondary: 'Cancel',
  },
  poll: {
    title: 'Lost connection',
    body: "We couldn't check the result. The same job is still waiting.",
    primary: 'Retry checking',
    secondary: 'Cancel',
  },
  timeout: {
    title: 'Still reading',
    body: 'This is taking longer than usual. Keep checking or start over.',
    primary: 'Keep checking',
    secondary: 'Start over',
  },
  failed: {
    title: "Couldn't read this receipt",
    body: 'The image may be unclear. Try again or retake it.',
    primary: 'Try again',
    secondary: 'Retake',
  },
  rejected: {
    title: 'Not a receipt',
    body: 'Use a clearer photo of a receipt or enter it manually.',
    primary: 'Retake',
    secondary: 'Enter manually',
  },
};

interface AnalysisRetryBarProps {
  kind: AnalysisRetryKind;
  onPrimary: () => void;
  onSecondary: () => void;
}

export function AnalysisRetryBar({ kind, onPrimary, onSecondary }: AnalysisRetryBarProps) {
  const styles = useThemedStyles(makeStyles);
  const copy = COPY[kind];

  return (
    <View style={styles.wrap}>
      <View style={styles.iconBox}>
        <Text style={styles.iconText}>!</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.body}>{copy.body}</Text>
        <View style={styles.actions}>
          <Pressable
            style={styles.primary}
            onPress={onPrimary}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>{copy.primary}</Text>
          </Pressable>
          <Pressable
            style={styles.secondary}
            onPress={onSecondary}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>{copy.secondary}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.secondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 12,
  },
  iconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.dangerSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.expenseText,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.foreground,
  },
  body: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: fonts.regular,
    color: colors.mutedForeground,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  primary: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  primaryText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.primaryForeground,
  },
  secondary: {
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  secondaryText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: fonts.semibold,
    color: colors.mutedForeground,
  },
});
