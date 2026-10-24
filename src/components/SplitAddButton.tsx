import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { hapticSelection, hapticSuccess } from '../lib/haptics';
import { fonts, radii, shadows } from '../theme';
import type { ThemeColors } from '../theme';
import { Icon } from './Icon';

const GALLERY_HOLD_MS = 2000;
const HINT_VISIBLE_MS = 6000;
const HINT_STORAGE_KEY = '@prettycash/splitAddHintSeen';
const RING_SIZE = 52;
const RING_RADIUS = 23;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface SplitAddButtonProps {
  onScan: () => void;
  onGallery: () => void;
  onManual: () => void;
}

export function SplitAddButton({ onScan, onGallery, onManual }: SplitAddButtonProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const progress = useRef(new Animated.Value(0)).current;
  const longPressFired = useRef(false);
  const hintVisibleRef = useRef(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pressing, setPressing] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);

  const dismissHint = useCallback(() => {
    if (!hintVisibleRef.current) return;
    hintVisibleRef.current = false;
    setHintVisible(false);
    if (hintTimer.current) {
      clearTimeout(hintTimer.current);
      hintTimer.current = null;
    }
    AsyncStorage.setItem(HINT_STORAGE_KEY, '1').catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(HINT_STORAGE_KEY)
      .then((seen) => {
        if (cancelled || seen === '1') return;
        hintVisibleRef.current = true;
        setHintVisible(true);
        hintTimer.current = setTimeout(() => {
          dismissHint();
        }, HINT_VISIBLE_MS);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (hintTimer.current) {
        clearTimeout(hintTimer.current);
        hintTimer.current = null;
      }
    };
  }, [dismissHint]);

  const stopRing = useCallback(() => {
    progress.stopAnimation();
    progress.setValue(0);
    setPressing(false);
  }, [progress]);

  const startRing = () => {
    longPressFired.current = false;
    setPressing(true);
    progress.setValue(0);
    hapticSelection();
    Animated.timing(progress, {
      toValue: 1,
      duration: GALLERY_HOLD_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  };

  const openGallery = () => {
    longPressFired.current = true;
    stopRing();
    hapticSuccess();
    dismissHint();
    onGallery();
  };

  const handleScan = () => {
    dismissHint();
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    onScan();
  };

  const handleManual = () => {
    dismissHint();
    onManual();
  };

  const dashOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [RING_CIRCUMFERENCE, 0],
  });

  return (
    <View style={styles.wrap}>
      {hintVisible ? (
        <View style={styles.hint} pointerEvents="none">
          <Text style={styles.hintText}>Tap camera to scan · Hold 2s for gallery</Text>
          <View style={styles.hintArrow} />
        </View>
      ) : null}

      <View style={styles.pill}>
        <Pressable
          style={({ pressed }) => [styles.half, pressed && styles.halfPressed]}
          onPress={handleManual}
          accessibilityRole="button"
          accessibilityLabel="Enter manually"
        >
          <Icon name="pencil" size={22} color={colors.primaryForeground} />
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          style={({ pressed }) => [styles.half, pressed && styles.halfPressed]}
          onPress={handleScan}
          onPressIn={startRing}
          onPressOut={stopRing}
          onLongPress={openGallery}
          delayLongPress={GALLERY_HOLD_MS}
          accessibilityRole="button"
          accessibilityLabel="Scan receipt"
          accessibilityHint="Tap to scan. Hold for 2 seconds to choose from gallery."
          accessibilityActions={[{ name: 'gallery', label: 'Choose from gallery' }]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'gallery') {
              openGallery();
            }
          }}
        >
          <Icon name="camera" size={22} color={colors.primaryForeground} />
          {pressing ? (
            <Svg
              width={RING_SIZE}
              height={RING_SIZE}
              viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
              style={styles.ring}
              pointerEvents="none"
            >
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke="rgba(255,255,255,0.22)"
                strokeWidth={2.5}
                fill="none"
              />
              <AnimatedCircle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke={colors.primaryForeground}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeDasharray={[RING_CIRCUMFERENCE, RING_CIRCUMFERENCE]}
                strokeDashoffset={dashOffset}
                fill="none"
                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              />
            </Svg>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  wrap: {
    width: 104,
    height: 64,
    marginTop: -32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 30,
  },
  pill: {
    width: 104,
    height: 60,
    borderRadius: 30,
    padding: 3,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderWidth: 4,
    borderColor: colors.background,
    ...shadows.e2,
  },
  half: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  halfPressed: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    transform: [{ scale: 0.94 }],
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  ring: {
    position: 'absolute',
    top: -4,
    left: -4,
  },
  hint: {
    position: 'absolute',
    bottom: 68,
    right: -2,
    width: 204,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.sm,
    backgroundColor: colors.foreground,
    zIndex: 40,
    elevation: 12,
    ...shadows.e2,
  },
  hintText: {
    color: colors.background,
    fontSize: 11,
    lineHeight: 15,
    fontFamily: fonts.semibold,
  },
  hintArrow: {
    position: 'absolute',
    right: 30,
    bottom: -4,
    width: 8,
    height: 8,
    backgroundColor: colors.foreground,
    transform: [{ rotate: '45deg' }],
  },
});
