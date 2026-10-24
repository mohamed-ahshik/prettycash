import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useReducedMotion } from 'react-native-reanimated';
import { useThemedStyles } from '../context/ThemeContext';
import { radii, shadows } from '../theme';
import type { ThemeColors } from '../theme';
import { motion } from '../theme/motion';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: number;
  fill?: boolean;
}

export function BottomSheet({
  visible,
  onClose,
  children,
  maxHeight = 0.88,
  fill = false,
}: BottomSheetProps) {
  const styles = useThemedStyles(makeStyles);
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      if (reduceMotion) {
        translateY.value = 0;
        backdrop.value = 1;
      } else {
        translateY.value = withSpring(0, motion.spring.sheet);
        backdrop.value = withTiming(1, { duration: motion.duration.sheetIn });
      }
    } else if (mounted) {
      translateY.value = withTiming(
        SCREEN_HEIGHT,
        { duration: motion.duration.sheetOut, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(setMounted)(false);
        },
      );
      backdrop.value = withTiming(0, { duration: motion.duration.sheetOut });
    }
  }, [visible, mounted, reduceMotion, translateY, backdrop]);

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      translateY.value = Math.max(0, event.translationY);
      backdrop.value = Math.max(0, 1 - translateY.value / (SCREEN_HEIGHT * 0.5));
    })
    .onEnd((event) => {
      if (translateY.value > SCREEN_HEIGHT * 0.25 || event.velocityY > 800) {
        translateY.value = withTiming(SCREEN_HEIGHT, {
          duration: motion.duration.sheetOut,
          easing: Easing.in(Easing.cubic),
        });
        backdrop.value = withTiming(0, { duration: motion.duration.sheetOut });
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, motion.spring.sheet);
        backdrop.value = withSpring(1, motion.spring.sheet);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  if (!mounted) {
    return null;
  }

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]} pointerEvents="none" />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
          pointerEvents="box-none"
        >
          <GestureDetector gesture={pan}>
            <Animated.View
              style={[
                styles.card,
                fill ? { height: SCREEN_HEIGHT * maxHeight } : { maxHeight: SCREEN_HEIGHT * maxHeight },
                cardStyle,
              ]}
            >
              <View style={styles.grabber} />
              {children}
            </Animated.View>
          </GestureDetector>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  keyboardWrap: {
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 32,
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    ...shadows.e3,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
});
