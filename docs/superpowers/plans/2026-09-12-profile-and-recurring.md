# Profile & Recurring Transactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the avatar/greeting from the Home screen into the Profile screen, brand the Home header with "PrettyCash", and build the Profile screen with a user Hero Card, Recurring Transactions management, Settings controls, and an About modal.

**Architecture:** Component-driven design using theme tokens from `src/theme`. The Home screen header is simplified, while the Profile screen acts as a settings and recurring management hub using local React state and modals.

**Tech Stack:** React Native, Expo, TypeScript, `@expo/vector-icons` (`MaterialCommunityIcons`).

## Global Constraints

- Language: TypeScript (strict).
- Verification for every task: `npx tsc --noEmit`.
- Palette (verbatim): background `#FAFAFA`, foreground `#1E2422`, card `#FFFFFF`, primary `#00674F`, primary-foreground `#FFFFFF`, secondary `#DFF0EB`, secondary-foreground `#004D3B`, muted `#F0F5F3`, muted-foreground `#6C757D`, border `#E6EDEB`.
- About section: MUST NOT include license, credits, or framework/SDK mentions (per user constraint).
- Implementation status: Always update Implementation status in docs.

---

## Task 1: Domain types and initial profile/recurring datasets

**Files:**
- Create: `src/types/profile.ts`
- Modify: `src/types/index.ts`
- Create: `src/data/profileData.ts`

**Interfaces:**
- Produces: `RecurringItem`, `UserProfile`, `INITIAL_PROFILE`, `INITIAL_RECURRING_ITEMS`.

- [x] **Step 1: Create `src/types/profile.ts`**

```ts
export interface RecurringItem {
  id: string;
  name: string;
  type: 'expense' | 'income';
  amount: number;
  category: string;
  icon: string;
  colorBg: string;
  colorFg: string;
  dayOfMonth: number; // 1-31
  active: boolean;
}

export interface UserProfile {
  name: string;
  initial: string;
  email: string;
  memberSince: string;
  currency: string;
  notificationsEnabled: boolean;
  hapticsEnabled: boolean;
}
```

- [x] **Step 2: Export from `src/types/index.ts`**

Add to `src/types/index.ts`:
```ts
export * from './profile';
```

- [x] **Step 3: Create `src/data/profileData.ts`**

```ts
import { RecurringItem, UserProfile } from '../types';

export const INITIAL_PROFILE: UserProfile = {
  name: 'Maya',
  initial: 'M',
  email: 'maya@prettycash.app',
  memberSince: 'Sep 2026',
  currency: 'USD ($)',
  notificationsEnabled: true,
  hapticsEnabled: true,
};

export const INITIAL_RECURRING_ITEMS: RecurringItem[] = [
  {
    id: 'rec-rent',
    name: 'Rent',
    type: 'expense',
    amount: 1200.0,
    category: 'Bills',
    icon: 'file-document-outline',
    colorBg: '#F3E8FF',
    colorFg: '#7C3AED',
    dayOfMonth: 1,
    active: true,
  },
  {
    id: 'rec-netflix',
    name: 'Netflix',
    type: 'expense',
    amount: 15.99,
    category: 'Fun',
    icon: 'play',
    colorBg: '#FFEEE3',
    colorFg: '#E67E22',
    dayOfMonth: 8,
    active: true,
  },
  {
    id: 'rec-internet',
    name: 'Internet',
    type: 'expense',
    amount: 65.0,
    category: 'Bills',
    icon: 'file-document-outline',
    colorBg: '#F3E8FF',
    colorFg: '#7C3AED',
    dayOfMonth: 15,
    active: true,
  },
  {
    id: 'rec-salary',
    name: 'Salary',
    type: 'income',
    amount: 5200.0,
    category: 'Income',
    icon: 'briefcase-outline',
    colorBg: '#E8F5E9',
    colorFg: '#2E7D32',
    dayOfMonth: 1,
    active: true,
  },
];
```

- [x] **Step 4: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 5: Commit**

```bash
git add src/types/profile.ts src/types/index.ts src/data/profileData.ts
git commit -m "feat: add profile and recurring domain types and mock data"
```

---

## Task 2: Update HomeScreen header branding

**Files:**
- Modify: `src/screens/HomeScreen.tsx`

**Interfaces:**
- Removes avatar & "Hi Maya!" greeting; adds "PrettyCash" app branding title and date.

- [x] **Step 1: Edit `src/screens/HomeScreen.tsx`**

Replace the header in `src/screens/HomeScreen.tsx`:
```tsx
        <View style={styles.header}>
          <View>
            <Text style={styles.brandingTitle}>PrettyCash</Text>
            <Text style={styles.date}>{mockUser.date}</Text>
          </View>
        </View>
```
And in `styles`, replace `greeting`, `avatar`, `avatarText`, `headerLeft` with:
```tsx
  brandingTitle: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.foreground,
    letterSpacing: -0.3,
  },
```

- [x] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add src/screens/HomeScreen.tsx
git commit -m "feat: update HomeScreen header with PrettyCash branding"
```

---

## Task 3: Recurring transactions modal & Add recurring modal

**Files:**
- Create: `src/components/AddRecurringModal.tsx`
- Create: `src/components/RecurringModal.tsx`

**Interfaces:**
- Produces: `<AddRecurringModal visible onClose onSave />`, `<RecurringModal visible items onClose onToggleActive onAddItem />`.

- [x] **Step 1: Create `src/components/AddRecurringModal.tsx`**

```tsx
import React, { useState } from 'react';
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

export function AddRecurringModal({ visible, onClose, onSave }: AddRecurringModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORY_OPTIONS[0]);

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
  },
  dismissOverlay: {
    flex: 1,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    maxHeight: '85%',
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
```

- [x] **Step 2: Create `src/components/RecurringModal.tsx`**

```tsx
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { colors, fonts, radii } from '../theme';
import { RecurringItem } from '../types';
import { formatMoney } from '../utils/format';
import { AddRecurringModal } from './AddRecurringModal';
import { Icon } from './Icon';

interface RecurringModalProps {
  visible: boolean;
  items: RecurringItem[];
  onClose: () => void;
  onToggleActive: (id: string) => void;
  onAddItem: (item: Omit<RecurringItem, 'id' | 'active'>) => void;
}

export function RecurringModal({
  visible,
  items,
  onClose,
  onToggleActive,
  onAddItem,
}: RecurringModalProps) {
  const [filter, setFilter] = useState<'expense' | 'income'>('expense');
  const [addVisible, setAddVisible] = useState(false);

  const filteredItems = items.filter((it) => it.type === filter);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissOverlay} onPress={onClose} />
        <View style={styles.sheetCard}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <Text style={styles.sheetTitle}>Recurring</Text>
            <View style={styles.topBarActions}>
              <Pressable style={styles.addBtn} onPress={() => setAddVisible(true)}>
                <Icon name="plus" size={16} color={colors.primaryForeground} />
                <Text style={styles.addBtnText}>Add</Text>
              </Pressable>
              <Pressable style={styles.closeBtn} onPress={onClose}>
                <Icon name="close" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>

          {/* Toggle pill */}
          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggleBtn, filter === 'expense' && styles.activeToggleBtn]}
              onPress={() => setFilter('expense')}
            >
              <Text style={[styles.toggleText, filter === 'expense' && styles.activeToggleText]}>
                Expenses
              </Text>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, filter === 'income' && styles.activeToggleBtn]}
              onPress={() => setFilter('income')}
            >
              <Text style={[styles.toggleText, filter === 'income' && styles.activeToggleText]}>
                Income
              </Text>
            </Pressable>
          </View>

          {/* Items list */}
          <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
            {filteredItems.map((item, index) => (
              <View key={item.id} style={[styles.itemRow, index > 0 && styles.borderTop]}>
                <View style={[styles.iconBox, { backgroundColor: item.colorBg }]}>
                  <Icon name={item.icon} size={20} color={item.colorFg} />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemSchedule}>Day {item.dayOfMonth} of month</Text>
                </View>
                <View style={styles.amountWrap}>
                  <Text
                    style={[
                      styles.itemAmount,
                      { color: item.type === 'income' ? colors.incomeText : colors.foreground },
                    ]}
                  >
                    {item.type === 'income' ? '+' : '-'}${formatMoney(item.amount)}
                  </Text>
                  <Switch
                    value={item.active}
                    onValueChange={() => onToggleActive(item.id)}
                    trackColor={{ false: colors.border, true: colors.secondary }}
                    thumbColor={item.active ? colors.primary : '#FFFFFF'}
                  />
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        <AddRecurringModal
          visible={addVisible}
          onClose={() => setAddVisible(false)}
          onSave={onAddItem}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  dismissOverlay: {
    flex: 1,
  },
  sheetCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    maxHeight: '85%',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.foreground,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.primaryForeground,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: colors.muted,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.muted,
    borderRadius: radii.pill,
    padding: 4,
    marginBottom: 14,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  activeToggleBtn: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: fonts.semibold,
    color: colors.mutedForeground,
  },
  activeToggleText: {
    color: colors.primaryForeground,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
  listScroll: {
    maxHeight: 380,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: fonts.semibold,
    color: colors.foreground,
  },
  itemSchedule: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontFamily: fonts.regular,
    marginTop: 2,
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemAmount: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
});
```

- [x] **Step 3: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 4: Commit**

```bash
git add src/components/AddRecurringModal.tsx src/components/RecurringModal.tsx
git commit -m "feat: add RecurringModal and AddRecurringModal components"
```

---

## Task 4: CurrencyPickerModal and AboutModal components

**Files:**
- Create: `src/components/CurrencyPickerModal.tsx`
- Create: `src/components/AboutModal.tsx`

**Interfaces:**
- Produces: `<CurrencyPickerModal visible selected onSelect onClose />`, `<AboutModal visible onClose />`.

- [x] **Step 1: Create `src/components/CurrencyPickerModal.tsx`**

```tsx
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
```

- [x] **Step 2: Create `src/components/AboutModal.tsx`**

Contains app info with no license/credits/SDK text per user constraint:

```tsx
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii } from '../theme';
import { Icon } from './Icon';

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AboutModal({ visible, onClose }: AboutModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>About PrettyCash</Text>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Icon name="close" size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <View style={styles.badgeWrap}>
            <View style={styles.appIconCircle}>
              <Icon name="cash-multiple" size={32} color={colors.primaryForeground} />
            </View>
            <Text style={styles.appName}>PrettyCash</Text>
            <Text style={styles.version}>Version 1.0.0 (Build 1)</Text>
          </View>

          <Text style={styles.description}>
            PrettyCash is a modern, lightweight personal budget and expense tracking application
            designed for speed, clarity, and peace of mind.
          </Text>
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
    maxWidth: 340,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.foreground,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 14,
    backgroundColor: colors.muted,
  },
  badgeWrap: {
    alignItems: 'center',
    marginVertical: 12,
  },
  appIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  appName: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.foreground,
  },
  version: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  description: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.mutedForeground,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
  },
});
```

- [x] **Step 3: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 4: Commit**

```bash
git add src/components/CurrencyPickerModal.tsx src/components/AboutModal.tsx
git commit -m "feat: add CurrencyPickerModal and AboutModal components"
```

---

## Task 5: ProfileScreen assembly & build verification

**Files:**
- Modify: `src/screens/ProfileScreen.tsx`
- Modify: `docs/superpowers/specs/2026-09-12-profile-and-recurring-design.md` (Update Implementation status)

**Interfaces:**
- Produces: Complete `<ProfileScreen />` with Hero card, Recurring modal, Settings options, and About modal.

- [x] **Step 1: Replace `src/screens/ProfileScreen.tsx`**

```tsx
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AboutModal } from '../components/AboutModal';
import { CurrencyPickerModal } from '../components/CurrencyPickerModal';
import { Icon } from '../components/Icon';
import { RecurringModal } from '../components/RecurringModal';
import { INITIAL_PROFILE, INITIAL_RECURRING_ITEMS } from '../data/profileData';
import { colors, fonts, radii } from '../theme';
import { RecurringItem, UserProfile } from '../types';

export function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>(INITIAL_RECURRING_ITEMS);

  const [recurringVisible, setRecurringVisible] = useState(false);
  const [currencyVisible, setCurrencyVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);

  const activeCount = recurringItems.filter((it) => it.active).length;

  const handleToggleRecurring = (id: string) => {
    setRecurringItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, active: !it.active } : it))
    );
  };

  const handleAddRecurring = (newItem: Omit<RecurringItem, 'id' | 'active'>) => {
    const itemWithId: RecurringItem = {
      ...newItem,
      id: `rec-${Date.now()}`,
      active: true,
    };
    setRecurringItems((prev) => [itemWithId, ...prev]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>Profile</Text>

        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.initial}</Text>
          </View>
          <Text style={styles.userName}>{profile.name}</Text>
          <Text style={styles.userSubtitle}>
            {profile.email} • Member since {profile.memberSince}
          </Text>
        </View>

        {/* Recurring Section */}
        <Text style={styles.sectionHeading}>Schedule</Text>
        <Pressable style={styles.menuRow} onPress={() => setRecurringVisible(true)}>
          <View style={[styles.menuIconBox, { backgroundColor: colors.secondary }]}>
            <Icon name="calendar-sync" size={20} color={colors.primary} />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>Recurring Transactions</Text>
            <Text style={styles.menuSubtitle}>{activeCount} active schedules</Text>
          </View>
          <Icon name="chevron-right" size={20} color={colors.mutedForeground} />
        </Pressable>

        {/* Settings Section */}
        <Text style={styles.sectionHeading}>Settings</Text>
        <View style={styles.settingsCard}>
          <Pressable style={styles.settingItem} onPress={() => setCurrencyVisible(true)}>
            <View style={styles.settingLeft}>
              <Icon name="currency-usd" size={20} color={colors.primary} />
              <Text style={styles.settingLabel}>Currency</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{profile.currency}</Text>
              <Icon name="chevron-right" size={18} color={colors.mutedForeground} />
            </View>
          </Pressable>

          <View style={[styles.settingItem, styles.borderTop]}>
            <View style={styles.settingLeft}>
              <Icon name="bell-outline" size={20} color={colors.primary} />
              <Text style={styles.settingLabel}>Payment Reminders</Text>
            </View>
            <Switch
              value={profile.notificationsEnabled}
              onValueChange={(val) => setProfile((p) => ({ ...p, notificationsEnabled: val }))}
              trackColor={{ false: colors.border, true: colors.secondary }}
              thumbColor={profile.notificationsEnabled ? colors.primary : '#FFFFFF'}
            />
          </View>

          <View style={[styles.settingItem, styles.borderTop]}>
            <View style={styles.settingLeft}>
              <Icon name="vibrate" size={20} color={colors.primary} />
              <Text style={styles.settingLabel}>Haptic Feedback</Text>
            </View>
            <Switch
              value={profile.hapticsEnabled}
              onValueChange={(val) => setProfile((p) => ({ ...p, hapticsEnabled: val }))}
              trackColor={{ false: colors.border, true: colors.secondary }}
              thumbColor={profile.hapticsEnabled ? colors.primary : '#FFFFFF'}
            />
          </View>
        </View>

        {/* About Section */}
        <Text style={styles.sectionHeading}>General</Text>
        <Pressable style={styles.menuRow} onPress={() => setAboutVisible(true)}>
          <View style={[styles.menuIconBox, { backgroundColor: colors.muted }]}>
            <Icon name="information-outline" size={20} color={colors.foreground} />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>About PrettyCash</Text>
            <Text style={styles.menuSubtitle}>Version 1.0.0</Text>
          </View>
          <Icon name="chevron-right" size={20} color={colors.mutedForeground} />
        </Pressable>
      </ScrollView>

      <RecurringModal
        visible={recurringVisible}
        items={recurringItems}
        onClose={() => setRecurringVisible(false)}
        onToggleActive={handleToggleRecurring}
        onAddItem={handleAddRecurring}
      />

      <CurrencyPickerModal
        visible={currencyVisible}
        selected={profile.currency}
        onSelect={(cur) => setProfile((p) => ({ ...p, currency: cur }))}
        onClose={() => setCurrencyVisible(false)}
      />

      <AboutModal visible={aboutVisible} onClose={() => setAboutVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.foreground,
    marginBottom: 16,
  },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.primaryForeground,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.foreground,
  },
  userSubtitle: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 8,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuInfo: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: fonts.semibold,
    color: colors.foreground,
  },
  menuSubtitle: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  settingsCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.foreground,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingValue: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    color: colors.mutedForeground,
  },
});
```

- [x] **Step 2: Update spec implementation status**

In `docs/superpowers/specs/2026-09-12-profile-and-recurring-design.md`, set `Implementation status:` to `Implemented`.

- [x] **Step 3: Verify type-check & Android bundle export**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx expo export --platform android`
Expected: bundles successfully without errors.

- [x] **Step 4: Commit**

```bash
git add src/screens/ProfileScreen.tsx docs/superpowers/specs/2026-09-12-profile-and-recurring-design.md
git commit -m "feat: implement ProfileScreen with hero card, recurring schedule, settings, and about modal"
```
