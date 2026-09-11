# Categories Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Categories screen replacing the Wallets tab, with Expense/Income segmented filtering and an Add Category modal.

**Architecture:** A standalone React Native + Expo screen with local React state managing category items. Reusable UI components for segmented control and category modal dialogs follow the established PrettyCash design tokens (`src/theme`).

**Tech Stack:** React Native, Expo, TypeScript, `@expo/vector-icons` (`MaterialCommunityIcons`), `@react-navigation/bottom-tabs`.

## Global Constraints

- Language: TypeScript (strict).
- Verification for every task: `npx tsc --noEmit`.
- Palette (verbatim): background `#FAFAFA`, foreground `#1E2422`, card `#FFFFFF`, primary `#00674F`, primary-foreground `#FFFFFF`, secondary `#DFF0EB`, secondary-foreground `#004D3B`, muted `#F0F5F3`, muted-foreground `#6C757D`, border `#E6EDEB`.
- TabBar: 4th tab renamed from `Wallets` to `Categories`, icon `shape` (active) / `shape-outline` (inactive).
- Category modal: includes Category Name, Notes, Icon selection, and Color palette selection.
- Implementation status: Always write Implementation status so loop runners can update progress.

---

## Task 1: Category types & default dataset

**Files:**
- Create: `src/types/category.ts`
- Modify: `src/types/index.ts`
- Create: `src/data/categoriesData.ts`

**Interfaces:**
- Produces: `CategoryItem`, `CategoryType`, `INITIAL_EXPENSE_CATEGORIES`, `INITIAL_INCOME_CATEGORIES`, `PRESET_CATEGORY_COLORS`, `PRESET_CATEGORY_ICONS`.

- [x] **Step 1: Create `src/types/category.ts`**

```ts
export type CategoryType = 'expense' | 'income';

export interface CategoryItem {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  colorBg: string;
  colorFg: string;
  notes?: string;
}

export interface PresetColor {
  bg: string;
  fg: string;
}
```

- [x] **Step 2: Export from `src/types/index.ts`**

Add re-export to `src/types/index.ts`:
```ts
export * from './category';
```

- [x] **Step 3: Create `src/data/categoriesData.ts`**

```ts
import { CategoryItem, PresetColor } from '../types';

export const PRESET_CATEGORY_COLORS: PresetColor[] = [
  { bg: '#DFF0EB', fg: '#00674F' },
  { bg: '#E8EFFD', fg: '#3B5BDB' },
  { bg: '#FFEEE3', fg: '#E67E22' },
  { bg: '#FFF4D6', fg: '#9C7A00' },
  { bg: '#E8F5E9', fg: '#2E7D32' },
  { bg: '#F3E8FF', fg: '#7C3AED' },
  { bg: '#FCE7F3', fg: '#DB2777' },
  { bg: '#E0F2FE', fg: '#0284C7' },
];

export const PRESET_CATEGORY_ICONS: string[] = [
  'cart-outline',
  'car-outline',
  'coffee-outline',
  'play',
  'file-document-outline',
  'bag-handle-outline',
  'briefcase-outline',
  'laptop',
  'chart-line',
  'gift-outline',
  'home-outline',
  'medical-bag',
];

export const INITIAL_EXPENSE_CATEGORIES: CategoryItem[] = [
  { id: 'exp-1', name: 'Food', type: 'expense', icon: 'cart-outline', colorBg: '#DFF0EB', colorFg: '#00674F', notes: 'Groceries & dining' },
  { id: 'exp-2', name: 'Travel', type: 'expense', icon: 'car-outline', colorBg: '#E8EFFD', colorFg: '#3B5BDB', notes: 'Commute & transit' },
  { id: 'exp-3', name: 'Fun', type: 'expense', icon: 'play', colorBg: '#FFEEE3', colorFg: '#E67E22', notes: 'Movies & subscriptions' },
  { id: 'exp-4', name: 'Coffee', type: 'expense', icon: 'coffee-outline', colorBg: '#FFF4D6', colorFg: '#9C7A00', notes: 'Cafes & quick bites' },
  { id: 'exp-5', name: 'Bills', type: 'expense', icon: 'file-document-outline', colorBg: '#F3E8FF', colorFg: '#7C3AED', notes: 'Utilities & rent' },
  { id: 'exp-6', name: 'Shopping', type: 'expense', icon: 'bag-handle-outline', colorBg: '#FCE7F3', colorFg: '#DB2777', notes: 'Personal items & gear' },
];

export const INITIAL_INCOME_CATEGORIES: CategoryItem[] = [
  { id: 'inc-1', name: 'Salary', type: 'income', icon: 'briefcase-outline', colorBg: '#E8F5E9', colorFg: '#2E7D32', notes: 'Monthly payroll' },
  { id: 'inc-2', name: 'Freelance', type: 'income', icon: 'laptop', colorBg: '#E0F2FE', colorFg: '#0284C7', notes: 'Client contracts & gigs' },
  { id: 'inc-3', name: 'Investments', type: 'income', icon: 'chart-line', colorBg: '#FEF3C7', colorFg: '#D97706', notes: 'Dividends & capital gains' },
  { id: 'inc-4', name: 'Gifts', type: 'income', icon: 'gift-outline', colorBg: '#FFE4E6', colorFg: '#E11D48', notes: 'Occasions & bonuses' },
];
```

- [x] **Step 4: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 5: Commit**

```bash
git add src/types src/data/categoriesData.ts
git commit -m "feat: add category types and initial dataset"
```

---

## Task 2: SegmentedControl & CategoryRow components

**Files:**
- Create: `src/components/SegmentedControl.tsx`
- Create: `src/components/CategoryRow.tsx`

**Interfaces:**
- Consumes: `CategoryItem`, `CategoryType` from `src/types`; theme tokens from `src/theme`; `Icon` component.
- Produces: `<SegmentedControl selected onSelect />`, `<CategoryRow item />`.

- [x] **Step 1: Create `src/components/SegmentedControl.tsx`**

```tsx
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
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
```

- [x] **Step 2: Create `src/components/CategoryRow.tsx`**

```tsx
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
```

- [x] **Step 3: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 4: Commit**

```bash
git add src/components/SegmentedControl.tsx src/components/CategoryRow.tsx
git commit -m "feat: add SegmentedControl and CategoryRow components"
```

---

## Task 3: AddCategoryModal component

**Files:**
- Create: `src/components/AddCategoryModal.tsx`

**Interfaces:**
- Consumes: `CategoryItem`, `CategoryType`, `PRESET_CATEGORY_COLORS`, `PRESET_CATEGORY_ICONS` from `src/types` and `src/data/categoriesData`; `colors`, `fonts`, `radii` from `src/theme`; `Icon`.
- Produces: `<AddCategoryModal visible type onClose onSave />`.

- [x] **Step 1: Create `src/components/AddCategoryModal.tsx`**

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
import { PRESET_CATEGORY_COLORS, PRESET_CATEGORY_ICONS } from '../data/categoriesData';
import { colors, fonts, radii } from '../theme';
import { CategoryItem, CategoryType } from '../types';
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.dismissOverlay} onPress={onClose} />
        <View style={styles.modalCard}>
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
  subtitle: {
    fontSize: 12,
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
```

- [x] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add src/components/AddCategoryModal.tsx
git commit -m "feat: add AddCategoryModal component"
```

---

## Task 4: CategoriesScreen, TabBar update, and App wiring

**Files:**
- Create: `src/screens/CategoriesScreen.tsx`
- Delete: `src/screens/WalletsScreen.tsx`
- Modify: `src/components/TabBar.tsx`
- Modify: `App.tsx`
- Modify: `docs/superpowers/specs/2026-09-12-categories-screen-design.md` (Update Implementation status)

**Interfaces:**
- Consumes: `SegmentedControl`, `CategoryRow`, `AddCategoryModal`; `INITIAL_EXPENSE_CATEGORIES`, `INITIAL_INCOME_CATEGORIES`.
- Produces: `<CategoriesScreen />` wired into `App.tsx` tab navigation.

- [x] **Step 1: Create `src/screens/CategoriesScreen.tsx`**

```tsx
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AddCategoryModal } from '../components/AddCategoryModal';
import { CategoryRow } from '../components/CategoryRow';
import { Icon } from '../components/Icon';
import { SegmentedControl } from '../components/SegmentedControl';
import { INITIAL_EXPENSE_CATEGORIES, INITIAL_INCOME_CATEGORIES } from '../data/categoriesData';
import { colors, fonts, radii } from '../theme';
import { CategoryItem, CategoryType } from '../types';

export function CategoriesScreen() {
  const [activeType, setActiveType] = useState<CategoryType>('expense');
  const [expenseCategories, setExpenseCategories] = useState<CategoryItem[]>(INITIAL_EXPENSE_CATEGORIES);
  const [incomeCategories, setIncomeCategories] = useState<CategoryItem[]>(INITIAL_INCOME_CATEGORIES);
  const [modalVisible, setModalVisible] = useState(false);

  const currentList = activeType === 'expense' ? expenseCategories : incomeCategories;

  const handleAddCategory = (newItem: Omit<CategoryItem, 'id'>) => {
    const itemWithId: CategoryItem = {
      ...newItem,
      id: `${newItem.type}-${Date.now()}`,
    };
    if (newItem.type === 'expense') {
      setExpenseCategories((prev) => [itemWithId, ...prev]);
    } else {
      setIncomeCategories((prev) => [itemWithId, ...prev]);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Categories</Text>
          <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
            <Icon name="plus" size={16} color={colors.primaryForeground} />
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>

        <SegmentedControl selected={activeType} onSelect={setActiveType} />

        <View style={styles.card}>
          {currentList.map((item, index) => (
            <CategoryRow key={item.id} item={item} isFirst={index === 0} />
          ))}
        </View>
      </ScrollView>

      <AddCategoryModal
        visible={modalVisible}
        type={activeType}
        onClose={() => setModalVisible(false)}
        onSave={handleAddCategory}
      />
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
    paddingTop: 24,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.foreground,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.pill,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.primaryForeground,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
});
```

- [x] **Step 2: Update `src/components/TabBar.tsx`**

Replace `Wallets` with `Categories` and use `shape` / `shape-outline` icons:
```tsx
type TabName = 'Home' | 'Insights' | 'Categories' | 'Profile';

const TAB_ICONS: Record<TabName, { active: string; inactive: string }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Insights: { active: 'chart-pie', inactive: 'chart-pie' },
  Categories: { active: 'shape', inactive: 'shape-outline' },
  Profile: { active: 'account', inactive: 'account-outline' },
};
```
And inside `TabBar`:
Replace `{renderTab('Wallets')}` with `{renderTab('Categories')}`.

- [x] **Step 3: Update `App.tsx` and delete `WalletsScreen.tsx`**

1. In `App.tsx`, replace `import { WalletsScreen } from './src/screens/WalletsScreen';` with:
```tsx
import { CategoriesScreen } from './src/screens/CategoriesScreen';
```
2. Replace `<Tab.Screen name="Wallets" component={WalletsScreen} />` with:
```tsx
<Tab.Screen name="Categories" component={CategoriesScreen} />
```
3. Remove `src/screens/WalletsScreen.tsx`.

- [x] **Step 4: Update spec implementation status**

In `docs/superpowers/specs/2026-09-12-categories-screen-design.md`, set `Implementation status:` to `Implemented`.

- [x] **Step 5: Verify type-check & Android bundle**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx expo export --platform android`
Expected: bundles successfully without errors.

- [x] **Step 6: Commit**

```bash
git rm src/screens/WalletsScreen.tsx
git add -A
git commit -m "feat: implement Categories screen with Expense/Income toggle and Add modal"
```
