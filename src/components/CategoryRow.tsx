import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { fonts } from '../theme';
import type { ThemeColors } from '../theme';
import { CategoryItem } from '../types';
import { CategoryAvatar } from './CategoryAvatar';
import { Icon } from './Icon';

interface CategoryRowProps {
  item: CategoryItem;
  isFirst?: boolean;
  onPress?: () => void;
}

export function CategoryRow({ item, isFirst = false, onPress }: CategoryRowProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [styles.row, !isFirst && styles.borderTop, pressed && styles.pressed]}
      onPress={onPress}
    >
      <CategoryAvatar icon={item.icon} colorBg={item.colorBg} colorFg={item.colorFg} size={42} />
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        {item.notes ? (
          <Text style={styles.notes} numberOfLines={1}>
            {item.notes}
          </Text>
        ) : null}
      </View>
      <Icon name="chevron-right" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: fonts.semibold,
    color: colors.foreground,
  },
  notes: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.85,
  },
});
