import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { CategoryItem } from '../types';
import { Icon } from './Icon';

interface CategoryRowProps {
  item: CategoryItem;
  isFirst?: boolean;
}

export function CategoryRow({ item, isFirst = false }: CategoryRowProps) {
  return (
    <View style={[styles.row, !isFirst && styles.borderTop]}>
      <View style={[styles.iconCircle, { backgroundColor: item.colorBg }]}>
        <Icon name={item.icon} size={20} color={item.colorFg} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        {item.notes ? (
          <Text style={styles.notes} numberOfLines={1}>
            {item.notes}
          </Text>
        ) : null}
      </View>
      <Icon name="chevron-right" size={18} color={colors.mutedForeground} />
    </View>
  );
}

const styles = StyleSheet.create({
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
  iconCircle: {
    height: 42,
    width: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
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
});
