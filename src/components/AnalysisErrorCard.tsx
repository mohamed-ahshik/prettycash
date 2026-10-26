import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '../context/ThemeContext';
import { fonts, radii } from '../theme';
import type { ThemeColors } from '../theme';
import type { PickedReceiptImage } from '../services/receiptPicker';

export type AnalysisErrorKind =
  | 'upload'
  | 'enqueue'
  | 'poll'
  | 'timeout'
  | 'rejected'
  | 'failed';

export type AnalysisErrorAction =
  | 'retry-upload'
  | 'retry-analysis'
  | 'retry-checking'
  | 'keep-checking'
  | 'start-over'
  | 'try-again'
  | 'scan-again'
  | 'choose-photo'
  | 'enter-manually';

interface ActionSpec {
  label: string;
  action: AnalysisErrorAction;
}

interface ErrorCopy {
  title: string;
  body: string;
  primary: ActionSpec;
  secondary: ActionSpec[];
}

const COPY: Record<AnalysisErrorKind, ErrorCopy> = {
  upload: {
    title: 'Couldn’t send receipt',
    body: 'Check your connection and try again.',
    primary: { label: 'Retry upload', action: 'retry-upload' },
    secondary: [{ label: 'Choose another photo', action: 'choose-photo' }],
  },
  enqueue: {
    title: 'Analysis didn’t start',
    body: 'The receipt is still on this device. Retry starting the analysis.',
    primary: { label: 'Retry analysis', action: 'retry-analysis' },
    secondary: [],
  },
  poll: {
    title: 'Lost connection',
    body: 'We couldn’t check the result. The same job is still waiting.',
    primary: { label: 'Retry checking', action: 'retry-checking' },
    secondary: [],
  },
  timeout: {
    title: 'Still reading',
    body: 'This is taking longer than usual. Keep checking or start over.',
    primary: { label: 'Keep checking', action: 'keep-checking' },
    secondary: [{ label: 'Start over', action: 'start-over' }],
  },
  rejected: {
    title: 'Not a receipt',
    body: 'This photo doesn’t look like a receipt. Try a clearer shot or choose another photo.',
    primary: { label: 'Scan again', action: 'scan-again' },
    secondary: [{ label: 'Choose another photo', action: 'choose-photo' }],
  },
  failed: {
    title: 'Couldn’t read this receipt',
    body: 'Something went wrong while reading it. Try again, or use a different photo.',
    primary: { label: 'Try again', action: 'try-again' },
    secondary: [
      { label: 'Scan again', action: 'scan-again' },
      { label: 'Choose another photo', action: 'choose-photo' },
    ],
  },
};

interface AnalysisErrorCardProps {
  kind: AnalysisErrorKind;
  image: PickedReceiptImage;
  onAction: (action: AnalysisErrorAction) => void;
  onClose: () => void;
}

export function AnalysisErrorCard({
  kind,
  image,
  onAction,
  onClose,
}: AnalysisErrorCardProps) {
  const styles = useThemedStyles(makeStyles);
  const copy = COPY[kind];

  return (
    <View>
      <View style={styles.head}>
        <View style={styles.iconBox}>
          <Text style={styles.iconText}>!</Text>
        </View>
        <View style={styles.headCopy}>
          <Text style={styles.eyebrow}>SCANNING</Text>
          <Text style={styles.title}>{copy.title}</Text>
        </View>
        <Pressable
          testID="error-close"
          style={styles.close}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <Image
          source={{ uri: `data:${image.mimeType};base64,${image.base64}` }}
          style={styles.thumb}
          resizeMode="cover"
          accessibilityLabel="Receipt"
        />
        <Text style={styles.bodyText}>{copy.body}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          testID={`error-action-${copy.primary.action}`}
          style={styles.primary}
          onPress={() => onAction(copy.primary.action)}
          accessibilityRole="button"
        >
          <Text style={styles.primaryText}>{copy.primary.label}</Text>
        </Pressable>
        {copy.secondary.map((item) => (
          <Pressable
            key={item.action}
            testID={`error-action-${item.action}`}
            style={styles.secondary}
            onPress={() => onAction(item.action)}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>{item.label}</Text>
          </Pressable>
        ))}
        <Pressable
          testID="error-action-enter-manually"
          style={styles.manual}
          onPress={() => onAction('enter-manually')}
          accessibilityRole="button"
        >
          <Text style={styles.manualText}>Enter manually</Text>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dangerSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 16,
    fontFamily: fonts.bold,
    fontWeight: '800',
    color: colors.expenseText,
  },
  headCopy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 9,
    fontFamily: fonts.bold,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.mutedForeground,
  },
  title: {
    marginTop: 2,
    fontSize: 20,
    lineHeight: 24,
    fontFamily: fonts.bold,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: colors.foreground,
  },
  close: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    marginTop: -2,
    fontSize: 18,
    lineHeight: 20,
    fontFamily: fonts.regular,
    color: colors.mutedForeground,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginTop: 14,
    padding: 12,
    borderRadius: radii.md,
    backgroundColor: colors.muted,
  },
  thumb: {
    width: 74,
    height: 94,
    borderRadius: 10,
    backgroundColor: colors.card,
    transform: [{ rotate: '-2deg' }],
  },
  bodyText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: fonts.regular,
    color: colors.mutedForeground,
  },
  actions: {
    gap: 8,
    marginTop: 16,
  },
  primary: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  primaryText: {
    fontSize: 13,
    fontFamily: fonts.bold,
    fontWeight: '800',
    color: colors.primaryForeground,
  },
  secondary: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  secondaryText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    fontWeight: '700',
    color: colors.foreground,
  },
  manual: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  manualText: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    fontWeight: '700',
    color: colors.mutedForeground,
  },
});
