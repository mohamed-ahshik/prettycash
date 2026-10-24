import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useThemedStyles } from '../context/ThemeContext';
import { fonts, radii } from '../theme';
import type { ThemeColors } from '../theme';
import type { PickedReceiptImage } from '../services/receiptPicker';

export type AnalysisStage = 'sending' | 'reading' | 'finishing';

const STAGES: { key: AnalysisStage; label: string }[] = [
  { key: 'sending', label: 'Sending receipt' },
  { key: 'reading', label: 'Reading receipt' },
  { key: 'finishing', label: 'Finishing up' },
];

interface AnalysisProgressProps {
  image: PickedReceiptImage;
  stage: AnalysisStage;
  slowWait: boolean;
  reconnecting: boolean;
  onCancel: () => void;
}

export function AnalysisProgress({
  image,
  stage,
  slowWait,
  reconnecting,
  onCancel,
}: AnalysisProgressProps) {
  const styles = useThemedStyles(makeStyles);
  const reduceMotion = useReducedMotion();
  const sweep = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const activeIndex = STAGES.findIndex((item) => item.key === stage);

  useEffect(() => {
    if (reduceMotion) {
      sweep.setValue(0);
      pulse.setValue(1);
      return;
    }
    const useNativeDriver = Platform.OS !== 'web';
    const sweepLoop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 1300,
        easing: Easing.linear,
        useNativeDriver,
      }),
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver,
        }),
      ]),
    );
    sweepLoop.start();
    pulseLoop.start();
    return () => {
      sweepLoop.stop();
      pulseLoop.stop();
    };
  }, [pulse, reduceMotion, sweep]);

  return (
    <View>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>SCANNING</Text>
          <Text style={styles.title}>Reading your receipt</Text>
        </View>
        <Text style={styles.time}>{slowWait ? 'Taking longer' : '~5–10s'}</Text>
      </View>

      <View style={styles.receiptRow}>
        <Image
          source={{ uri: `data:${image.mimeType};base64,${image.base64}` }}
          style={styles.thumb}
          resizeMode="cover"
          accessibilityLabel="Receipt"
        />
        <View style={styles.stages}>
          {STAGES.map((item, index) => {
            const state = index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'pending';
            return (
              <View
                key={item.key}
                testID={`analysis-stage-${item.key}-${state}`}
                style={styles.stageRow}
              >
                <View
                  style={[
                    styles.stageDot,
                    state === 'done' && styles.stageDotDone,
                    state === 'active' && styles.stageDotActive,
                  ]}
                >
                  {state === 'done' ? (
                    <Text style={styles.check}>✓</Text>
                  ) : null}
                  {state === 'active' ? (
                    <Animated.View style={[styles.activeDot, { opacity: pulse }]} />
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.stageText,
                    state === 'done' && styles.stageTextDone,
                    state === 'active' && styles.stageTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.progressTrack}>
        {reduceMotion ? (
          <View style={styles.progressStatic} />
        ) : (
          <Animated.View
            style={[
              styles.progressFill,
              {
                transform: [
                  {
                    translateX: sweep.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-130, 320],
                    }),
                  },
                ],
              },
            ]}
          />
        )}
      </View>

      <Text style={styles.hint}>
        {slowWait
          ? 'This is taking a little longer than usual.'
          : 'Usually a few seconds. You can cancel if it takes too long.'}
      </Text>
      {reconnecting ? (
        <Text style={styles.reconnect}>Connection lost — retrying…</Text>
      ) : null}

      <Pressable
        testID="analysis-cancel"
        style={styles.cancel}
        onPress={onCancel}
        accessibilityRole="button"
      >
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: {
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
    marginTop: 3,
    fontSize: 22,
    lineHeight: 26,
    fontFamily: fonts.bold,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: colors.foreground,
  },
  time: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary,
    color: colors.secondaryForeground,
    fontSize: 9,
    fontFamily: fonts.bold,
    fontWeight: '800',
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginTop: 14,
  },
  thumb: {
    width: 74,
    height: 94,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    transform: [{ rotate: '-2deg' }],
  },
  stages: {
    flex: 1,
    gap: 8,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  stageDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageDotDone: {
    borderColor: colors.primary,
    backgroundColor: colors.secondary,
  },
  stageDotActive: {
    borderColor: colors.primary,
  },
  check: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  stageText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.mutedForeground,
  },
  stageTextDone: {
    color: colors.foreground,
  },
  stageTextActive: {
    fontFamily: fonts.bold,
    fontWeight: '800',
    color: colors.foreground,
  },
  progressTrack: {
    height: 4,
    marginTop: 16,
    borderRadius: 2,
    backgroundColor: colors.muted,
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '38%',
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  progressStatic: {
    width: '38%',
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    opacity: 0.6,
  },
  hint: {
    marginTop: 10,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: fonts.regular,
    color: colors.mutedForeground,
  },
  reconnect: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: fonts.regular,
    color: colors.mutedForeground,
  },
  cancel: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radii.pill,
    backgroundColor: colors.muted,
  },
  cancelText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    fontWeight: '700',
    color: colors.foreground,
  },
});
