import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii } from '../theme';
import { CategoryType } from '../types';

interface SegmentedControlProps {
  selected: CategoryType;
  onSelect: (type: CategoryType) => void;
}

export function SegmentedControl({ selected, onSelect }: SegmentedControlProps) {
  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.segment, selected === 'expense' && styles.activeSegment]}
        onPress={() => onSelect('expense')}
      >
        <Text style={[styles.label, selected === 'expense' && styles.activeLabel]}>Expense</Text>
      </Pressable>
      <Pressable
        style={[styles.segment, selected === 'income' && styles.activeSegment]}
        onPress={() => onSelect('income')}
      >
        <Text style={[styles.label, selected === 'income' && styles.activeLabel]}>Income</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.muted,
    borderRadius: radii.pill,
    padding: 4,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 320,
    marginTop: 16,
    marginBottom: 20,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeSegment: {
    backgroundColor: colors.primary,
    boxShadow: [{ offsetX: 0, offsetY: 2, blurRadius: 4, color: 'rgba(0,0,0,0.08)' }],
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: fonts.semibold,
    color: colors.mutedForeground,
  },
  activeLabel: {
    color: colors.primaryForeground,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
});
