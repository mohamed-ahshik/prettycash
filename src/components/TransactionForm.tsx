import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useCategories } from '../context/CategoriesContext';
import { colors, fonts, radii } from '../theme';
import { LineItem, ReceiptDraft, Transaction, TransactionType } from '../types';
import { Icon } from './Icon';
import { SegmentedControl } from './SegmentedControl';

interface TransactionFormProps {
  initial?: Partial<ReceiptDraft>;
  onSubmit: (input: Omit<Transaction, 'id'>) => void;
  onCancel: () => void;
}

function todayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function currentTimeString(): string {
  const d = new Date();
  let hours = d.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes} ${ampm}`;
}

export function TransactionForm({ initial, onSubmit, onCancel }: TransactionFormProps) {
  const { expenseCategories, incomeCategories } = useCategories();

  const initialItems: LineItem[] = (initial?.items ?? []).map((it) => ({
    id: `it-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: it.name,
    quantity: it.quantity,
    price: it.price,
  }));

  const [name, setName] = useState(initial?.merchant ?? '');
  const [amount, setAmount] = useState(initial?.amount !== undefined ? String(initial.amount) : '');
  const [date, setDate] = useState(initial?.date ?? todayString());
  const [time, setTime] = useState(initial?.time ?? currentTimeString());
  const [note, setNote] = useState(initial?.note ?? '');
  const [items, setItems] = useState<LineItem[]>(initialItems);
  const [type, setType] = useState<TransactionType>('expense');
  const [categoryId, setCategoryId] = useState<string | null>(
    expenseCategories[0]?.id ?? null
  );

  const categories = type === 'expense' ? expenseCategories : incomeCategories;
  const valid = name.trim().length > 0 && Number(amount) > 0;

  const handleTypeSelect = (next: TransactionType) => {
    setType(next);
    const first = next === 'expense' ? expenseCategories : incomeCategories;
    setCategoryId(first[0]?.id ?? null);
  };

  const updateItem = (id: string, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const addItem = () => {
    setItems((prev) => [...prev, { id: `it-${Date.now()}`, name: '', price: 0 }]);
  };

  const handleSubmit = () => {
    const category = [...expenseCategories, ...incomeCategories].find((c) => c.id === categoryId);
    onSubmit({
      name: name.trim(),
      date,
      time,
      categoryId: categoryId ?? '',
      type,
      amount: Number(amount),
      icon: category?.icon ?? 'receipt',
      note: note.trim() || undefined,
      items: items.length ? items : undefined,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Add Transaction</Text>
        <Pressable style={styles.closeButton} onPress={onCancel}>
          <Icon name="close" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <SegmentedControl selected={type} onSelect={handleTypeSelect} />

      <ScrollView
        style={styles.formScroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.fieldLabel}>Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Coffee or Groceries"
          placeholderTextColor={colors.mutedForeground}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.fieldLabel}>Amount *</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />

        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={styles.fieldLabel}>Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mutedForeground}
              value={date}
              onChangeText={setDate}
            />
          </View>
          <View style={styles.dateField}>
            <Text style={styles.fieldLabel}>Time</Text>
            <TextInput
              style={styles.input}
              placeholder="h:mm AM"
              placeholderTextColor={colors.mutedForeground}
              value={time}
              onChangeText={setTime}
            />
          </View>
        </View>

        <Text style={styles.fieldLabel}>Category</Text>
        <View style={styles.categoryGrid}>
          {categories.map((c) => {
            const isSelected = c.id === categoryId;
            return (
              <Pressable
                key={c.id}
                style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                onPress={() => setCategoryId(c.id)}
              >
                <View style={[styles.categoryIcon, { backgroundColor: c.colorBg }]}>
                  <Icon name={c.icon} size={16} color={c.colorFg} />
                </View>
                <Text
                  style={[
                    styles.categoryChipLabel,
                    isSelected && styles.categoryChipLabelSelected,
                  ]}
                >
                  {c.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>Note (optional)</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder="Add a note"
          placeholderTextColor={colors.mutedForeground}
          multiline
          numberOfLines={3}
          value={note}
          onChangeText={setNote}
        />

        <Text style={styles.fieldLabel}>Line Items</Text>
        {items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <TextInput
              style={[styles.input, styles.itemName]}
              placeholder="Item name"
              placeholderTextColor={colors.mutedForeground}
              value={item.name}
              onChangeText={(text) => updateItem(item.id, { name: text })}
            />
            <TextInput
              style={[styles.input, styles.itemPrice]}
              placeholder="Price"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              value={item.price ? String(item.price) : ''}
              onChangeText={(text) => updateItem(item.id, { price: Number(text) || 0 })}
            />
            <TextInput
              style={[styles.input, styles.itemQty]}
              placeholder="Qty"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              value={item.quantity !== undefined ? String(item.quantity) : ''}
              onChangeText={(text) =>
                updateItem(item.id, { quantity: text.trim() === '' ? undefined : Number(text) })
              }
            />
            <Pressable style={styles.removeButton} onPress={() => removeItem(item.id)}>
              <Icon name="close" size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
        ))}
        <Pressable style={styles.addItemButton} onPress={addItem}>
          <Icon name="plus" size={16} color={colors.primary} />
          <Text style={styles.addItemText}>Add item</Text>
        </Pressable>
      </ScrollView>

      <Pressable
        style={[styles.saveButton, !valid && styles.saveButtonDisabled]}
        disabled={!valid}
        onPress={handleSubmit}
      >
        <Text style={styles.saveButtonText}>Save</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
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
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateField: {
    flex: 1,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  categoryChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.secondary,
  },
  categoryIcon: {
    height: 28,
    width: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipLabel: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: fonts.semibold,
    color: colors.mutedForeground,
  },
  categoryChipLabelSelected: {
    color: colors.primary,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  itemName: {
    flex: 1.4,
  },
  itemPrice: {
    flex: 1,
  },
  itemQty: {
    flex: 0.7,
  },
  removeButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: colors.muted,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addItemText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: fonts.semibold,
    color: colors.primary,
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
