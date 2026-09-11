import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii } from '../theme';
import { Icon } from './Icon';

interface CurrencyPickerModalProps {
  visible: boolean;
  selected: string;
  onSelect: (currency: string) => void;
  onClose: () => void;
}

const CURRENCIES = [
  { label: 'USD ($)', code: 'USD' },
  { label: 'EUR (€)', code: 'EUR' },
  { label: 'GBP (£)', code: 'GBP' },
  { label: 'JPY (¥)', code: 'JPY' },
  { label: 'CAD ($)', code: 'CAD' },
];

export function CurrencyPickerModal({ visible, selected, onSelect, onClose }: CurrencyPickerModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.card}>
          <Text style={styles.title}>Select Currency</Text>
          {CURRENCIES.map((cur) => {
            const isSelected = selected === cur.label;
            return (
              <Pressable
                key={cur.code}
                style={[styles.row, isSelected && styles.selectedRow]}
                onPress={() => {
                  onSelect(cur.label);
                  onClose();
                }}
              >
                <Text style={[styles.label, isSelected && styles.selectedLabel]}>{cur.label}</Text>
                {isSelected ? <Icon name="check" size={18} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
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
    maxWidth: 320,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.foreground,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedRow: {
    backgroundColor: colors.muted,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
  },
  label: {
    fontSize: 15,
    fontFamily: fonts.medium,
    color: colors.foreground,
  },
  selectedLabel: {
    color: colors.primary,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
});
