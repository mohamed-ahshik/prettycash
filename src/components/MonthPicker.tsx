import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { fonts, radii } from '../theme';
import type { ThemeColors } from '../theme';
import { Icon } from './Icon';

interface MonthPickerProps {
  month: string;
  onPress?: () => void;
}

export function MonthPicker({ month, onPress }: MonthPickerProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();

  return (
    <Pressable style={({ pressed }) => [styles.pill, pressed && styles.pressed]} onPress={onPress}>
      <Icon name="calendar" size={18} color={colors.primary} />
      <Text style={styles.label}>{month}</Text>
      <Icon name="chevron-down" size={18} color={colors.primary} />
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    marginTop: 16,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.foreground,
  },
  pressed: {
    opacity: 0.85,
  },
});
