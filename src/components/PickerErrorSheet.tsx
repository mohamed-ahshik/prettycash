import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { fonts, radii } from '../theme';
import type { ThemeColors } from '../theme';
import type { ReceiptPickerError } from '../hooks/useReceiptPicker';
import { BottomSheet } from './BottomSheet';
import { Icon } from './Icon';

interface PickerErrorSheetProps {
  error: ReceiptPickerError | null;
  onGallery: () => void;
  onClose: () => void;
}

export function PickerErrorSheet({ error, onGallery, onClose }: PickerErrorSheetProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const galleryError = error === 'gallery_failed';
  const title = galleryError ? 'Gallery unavailable' : 'Camera unavailable';
  const body = galleryError
    ? "We couldn't open your photo library. Please try again."
    : 'Camera access is off, or the camera could not open. You can choose a receipt from your gallery instead.';
  const primaryLabel = galleryError ? 'Try again' : 'Choose from gallery';

  return (
    <BottomSheet visible={error !== null} onClose={onClose} maxHeight={0.5}>
      <View style={styles.card}>
        <View style={styles.iconBox}>
          <Icon
            name={galleryError ? 'image-off-outline' : 'camera-off-outline'}
            size={24}
            color={colors.primary}
          />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        <Pressable style={styles.primary} onPress={onGallery} accessibilityRole="button">
          <Text style={styles.primaryText}>{primaryLabel}</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={onClose} accessibilityRole="button">
          <Text style={styles.secondaryText}>Cancel</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    alignItems: 'center',
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.foreground,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  body: {
    marginTop: 6,
    marginBottom: 20,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fonts.regular,
    color: colors.mutedForeground,
    textAlign: 'center',
    maxWidth: 320,
  },
  primary: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  primaryText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.primaryForeground,
  },
  secondary: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginTop: 4,
  },
  secondaryText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: fonts.semibold,
    color: colors.mutedForeground,
  },
});
