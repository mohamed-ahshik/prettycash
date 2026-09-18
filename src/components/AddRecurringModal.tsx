import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, fonts, radii } from '../theme';
import { RecurringItem } from '../types';
import { Icon } from './Icon';

interface AddRecurringModalProps {
  visible: boolean;
  initialType?: 'expense' | 'income';
  onClose: () => void;
  onSave: (item: Omit<RecurringItem, 'id' | 'active'>) => void;
}

const CATEGORY_OPTIONS = [
  { name: 'Bills', icon: 'file-document-outline', bg: '#F3E8FF', fg: '#7C3AED' },
  { name: 'Food', icon: 'cart-outline', bg: '#DFF0EB', fg: '#00674F' },
  { name: 'Fun', icon: 'play', bg: '#FFEEE3', fg: '#E67E22' },
  { name: 'Travel', icon: 'car-outline', bg: '#E8EFFD', fg: '#3B5BDB' },
  { name: 'Income', icon: 'briefcase-outline', bg: '#E8F5E9', fg: '#2E7D32' },
];

export function AddRecurringModal({ visible, initialType, onClose, onSave }: AddRecurringModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>(initialType ?? 'expense');
  const [amount, setAmount] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORY_OPTIONS[0]);

  useEffect(() => {
    if (visible) setType(initialType ?? 'expense');
  }, [visible, initialType]);

  const handleSave = () => {
    const numAmount = parseFloat(amount);
    const day = parseInt(dayOfMonth, 10);
    if (!name.trim() || isNaN(numAmount) || isNaN(day)) return;

    onSave({
      name: name.trim(),
      type,
      amount: numAmount,
      category: selectedCategory.name,
      icon: selectedCategory.icon,
      colorBg: selectedCategory.bg,
      colorFg: selectedCategory.fg,
      dayOfMonth: Math.min(Math.max(day, 1), 31),
    });

    setName('');
    setAmount('');
    setDayOfMonth('1');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.dismissOverlay} onPress={onClose} />
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <Text style={styles.title}>New Recurring Item</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Icon name="close" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Type toggle */}
            <View style={styles.typeToggle}>
              <Pressable
                style={[styles.typeSegment, type === 'expense' && styles.activeTypeSegment]}
                onPress={() => setType('expense')}
              >
                <Text style={[styles.typeLabel, type === 'expense' && styles.activeTypeLabel]}>
                  Expense
                </Text>
              </Pressable>
              <Pressable
                style={[styles.typeSegment, type === 'income' && styles.activeTypeSegment]}
                onPress={() => setType('income')}
              >
                <Text style={[styles.typeLabel, type === 'income' && styles.activeTypeLabel]}>
                  Income
                </Text>
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>Item Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Rent or Salary"
              placeholderTextColor={colors.mutedForeground}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.fieldLabel}>Amount ($) *</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              keyboardType="numeric"
              placeholderTextColor={colors.mutedForeground}
              value={amount}
              onChangeText={setAmount}
            />

            <Text style={styles.fieldLabel}>Day of Month (1 - 31)</Text>
            <TextInput
              style={styles.input}
              placeholder="1"
              keyboardType="number-pad"
              placeholderTextColor={colors.mutedForeground}
              value={dayOfMonth}
              onChangeText={setDayOfMonth}
            />

            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.categoryRow}>
              {CATEGORY_OPTIONS.map((cat) => {
                const isSelected = selectedCategory.name === cat.name;
                return (
                  <Pressable
                    key={cat.name}
                    style={[
                      styles.categoryChip,
                      isSelected && { borderColor: colors.primary, backgroundColor: colors.secondary },
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Icon name={cat.icon} size={16} color={isSelected ? colors.primary : colors.mutedForeground} />
                    <Text style={[styles.categoryText, isSelected && { color: colors.primary, fontWeight: '700' }]}>
                      {cat.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <Pressable
            style={[styles.saveButton, (!name.trim() || !amount.trim()) && styles.saveButtonDisabled]}
            disabled={!name.trim() || !amount.trim()}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Schedule Item</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  dismissOverlay: {
    ...StyleSheet.absoluteFill,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    maxHeight: '85%',
    width: '100%',
    maxWidth: 430,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.foreground,
  },
  closeButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: colors.muted,
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.muted,
    borderRadius: radii.pill,
    padding: 4,
    marginBottom: 12,
  },
  typeSegment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  activeTypeSegment: {
    backgroundColor: colors.primary,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: fonts.semibold,
    color: colors.mutedForeground,
  },
  activeTypeLabel: {
    color: colors.primaryForeground,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  formScroll: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: fonts.semibold,
    color: colors.foreground,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.foreground,
    fontFamily: fonts.regular,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  categoryText: {
    fontSize: 12,
    color: colors.foreground,
    fontFamily: fonts.medium,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.45,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.primaryForeground,
  },
});
