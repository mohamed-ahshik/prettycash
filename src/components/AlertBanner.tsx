import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { radii, text } from '../theme';
import type { ThemeColors } from '../theme';
import { Icon } from './Icon';

export function AlertBanner({ message }: { message: string }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <Icon name="alert-circle-outline" size={18} color={colors.expenseText} />
      <Text style={[text.label, styles.text]}>{message}</Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dangerSurface,
    borderRadius: radii.sm,
    padding: 12,
    marginBottom: 8,
  },
  text: {
    flex: 1,
    color: colors.foreground,
  },
});
