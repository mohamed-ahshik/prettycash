import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { text } from '../theme';
import type { ThemeColors } from '../theme';
import { Icon } from './Icon';

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <View style={styles.circle}>
        <Icon name={icon} size={24} color={colors.primary} />
      </View>
      <Text style={[text.bodyLg, styles.title]}>{title}</Text>
      {subtitle ? <Text style={[text.caption, styles.subtitle]}>{subtitle}</Text> : null}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 4,
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    color: colors.foreground,
  },
  subtitle: {
    color: colors.mutedForeground,
    textAlign: 'center',
  },
});
