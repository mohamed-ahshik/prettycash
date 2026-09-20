import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { PRESET_CATEGORY_COLORS, PRESET_CATEGORY_ICONS } from '../data/categoriesData';
import { colors, fonts, radii } from '../theme';
import { CategoryItem, CategoryType } from '../types';
import { BottomSheet } from './BottomSheet';
import { Icon } from './Icon';

interface AddCategoryModalProps {
  visible: boolean;
  type: CategoryType;
  onClose: () => void;
  onSave: (item: Omit<CategoryItem, 'id'>) => void;
}

export function AddCategoryModal({ visible, type, onClose, onSave }: AddCategoryModalProps) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(PRESET_CATEGORY_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState(PRESET_CATEGORY_COLORS[0]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      type,
      notes: notes.trim() || undefined,
      icon: selectedIcon,
      colorBg: selectedColor.bg,
      colorFg: selectedColor.fg,
    });
    setName('');
    setNotes('');
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight={0.85}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Add Category</Text>
              <Text style={styles.subtitle}>
                Adding to {type === 'expense' ? 'Expense' : 'Income'}
              </Text>
            </View>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Icon name="close" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>Category Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Groceries or Freelance"
              placeholderTextColor={colors.mutedForeground}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="e.g. Monthly allocation or notes"
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />

            <Text style={styles.fieldLabel}>Select Icon</Text>
            <View style={styles.iconGrid}>
              {PRESET_CATEGORY_ICONS.map((iconName) => {
                const isSelected = selectedIcon === iconName;
                return (
                  <Pressable
                    key={iconName}
                    style={[
                      styles.iconChip,
                      isSelected && { borderColor: colors.primary, backgroundColor: colors.secondary },
                    ]}
                    onPress={() => setSelectedIcon(iconName)}
                  >
                    <Icon
                      name={iconName}
                      size={22}
                      color={isSelected ? colors.primary : colors.mutedForeground}
                    />
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Select Color</Text>
            <View style={styles.colorRow}>
              {PRESET_CATEGORY_COLORS.map((colorPair, index) => {
                const isSelected = selectedColor.bg === colorPair.bg;
                return (
                  <Pressable
                    key={index}
                    style={[
                      styles.colorChip,
                      { backgroundColor: colorPair.bg },
                      isSelected && styles.colorChipSelected,
                    ]}
                    onPress={() => setSelectedColor(colorPair)}
                  >
                    {isSelected ? (
                      <Icon name="check" size={16} color={colorPair.fg} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <Pressable
            style={[styles.saveButton, !name.trim() && styles.saveButtonDisabled]}
            disabled={!name.trim()}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Save Category</Text>
          </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    fontFamily: fonts.bold,
    letterSpacing: -0.3,
    color: colors.foreground,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.mutedForeground,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: colors.muted,
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
    marginTop: 12,
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
  multilineInput: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  iconChip: {
    height: 42,
    width: 42,
    borderRadius: 21,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  colorChip: {
    height: 36,
    width: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorChipSelected: {
    borderColor: colors.primary,
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
