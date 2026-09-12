import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii } from '../theme';
import { Icon } from './Icon';

export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec',
];

interface MonthYearPickerModalProps {
  visible: boolean;
  selectedMonth: number; // 0-11
  selectedYear: number;
  onClose: () => void;
  onSelect: (month: number, year: number) => void;
}

export function MonthYearPickerModal({
  visible,
  selectedMonth,
  selectedYear,
  onClose,
  onSelect,
}: MonthYearPickerModalProps) {
  const [year, setYear] = useState(selectedYear);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {/* Year selector header */}
          <View style={styles.yearRow}>
            <Pressable style={styles.arrowButton} onPress={() => setYear((y) => y - 1)}>
              <Icon name="chevron-left" size={24} color={colors.foreground} />
            </Pressable>
            <Text style={styles.yearText}>{year}</Text>
            <Pressable style={styles.arrowButton} onPress={() => setYear((y) => y + 1)}>
              <Icon name="chevron-right" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          {/* Month grid */}
          <View style={styles.grid}>
            {MONTH_NAMES.map((mName, idx) => {
              const isSelected = idx === selectedMonth && year === selectedYear;
              return (
                <Pressable
                  key={mName}
                  style={[styles.monthPill, isSelected && styles.selectedMonthPill]}
                  onPress={() => {
                    onSelect(idx, year);
                    onClose();
                  }}
                >
                  <Text style={[styles.monthText, isSelected && styles.selectedMonthText]}>
                    {mName}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: [{ offsetX: 0, offsetY: 4, blurRadius: 16, color: 'rgba(0,0,0,0.1)' }],
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  arrowButton: {
    padding: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.muted,
  },
  yearText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.foreground,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  monthPill: {
    width: '30%',
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedMonthPill: {
    backgroundColor: colors.primary,
  },
  monthText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: fonts.semibold,
    color: colors.foreground,
  },
  selectedMonthText: {
    color: colors.primaryForeground,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
});
