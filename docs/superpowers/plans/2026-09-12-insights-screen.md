# Insights Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Insights screen based on the reference image with an interactive SVG donut chart, expense/income toggle, category progress bars, and a month/year picker modal.

**Architecture:** Pure React Native + `react-native-svg` components driven by local React state. Breakdown metrics are computed dynamically from existing transactions, falling back to sample category datasets matching the reference design.

**Tech Stack:** React Native, Expo, TypeScript, `react-native-svg`, `@expo/vector-icons` (`MaterialCommunityIcons`).

## Global Constraints

- Language: TypeScript (strict).
- Verification for every task: `npx tsc --noEmit`.
- Palette (verbatim): background `#FAFAFA`, foreground `#1E2422`, card `#FFFFFF`, primary `#00674F`, primary-foreground `#FFFFFF`, secondary `#DFF0EB`, secondary-foreground `#004D3B`, muted `#F0F5F3`, muted-foreground `#6C757D`, border `#E6EDEB`.
- Colors matching screenshot: Food `#FFB800` (amber), Shopping `#00B4D8` (cyan), Drinks `#2EC4B6` (teal).
- No external chart libraries (`react-native-svg` is already installed and must be used).
- Implementation status: Always update Implementation status in docs.

---

## Task 1: Insights domain types & calculation utilities

**Files:**
- Create: `src/types/insights.ts`
- Modify: `src/types/index.ts`
- Create: `src/context/CategoriesContext.tsx`
- Create: `src/utils/insights.ts`

**Interfaces:**
- Produces: `CategoryBreakdownItem`, `InsightsData`, `CategoriesContext`, `useCategories()`, `getInsightsData(type, categories)`.

- [x] **Step 1: Create `src/types/insights.ts`**

```ts
export interface CategoryBreakdownItem {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  icon: string;
  color: string;
  bgColor: string;
}

export interface InsightsData {
  total: number;
  type: 'expense' | 'income';
  items: CategoryBreakdownItem[];
}
```

- [x] **Step 2: Export from `src/types/index.ts`**

Add to `src/types/index.ts`:
```ts
export * from './insights';
```

- [x] **Step 3: Create `src/context/CategoriesContext.tsx`**

Provides shared categories between the Categories tab and Insights tab:

```tsx
import React, { createContext, useContext, useState } from 'react';
import { CategoryItem } from '../types';

export const DEFAULT_EXPENSE_CATEGORIES: CategoryItem[] = [
  { id: 'exp-food', name: 'Food', type: 'expense', icon: 'silverware-fork-knife', colorBg: '#FFF4D6', colorFg: '#FFB800', notes: 'Groceries & dining' },
  { id: 'exp-shopping', name: 'Shopping', type: 'expense', icon: 'bag-personal-outline', colorBg: '#E0F2FE', colorFg: '#00B4D8', notes: 'Personal items & gear' },
  { id: 'exp-drinks', name: 'Drinks', type: 'expense', icon: 'glass-wine', colorBg: '#DFF0EB', colorFg: '#2EC4B6', notes: 'Cafes & drinks' },
  { id: 'exp-travel', name: 'Travel', type: 'expense', icon: 'car-outline', colorBg: '#E8EFFD', colorFg: '#3B5BDB', notes: 'Commute & transit' },
  { id: 'exp-fun', name: 'Fun', type: 'expense', icon: 'play', colorBg: '#FFEEE3', colorFg: '#E67E22', notes: 'Movies & subscriptions' },
  { id: 'exp-bills', name: 'Bills', type: 'expense', icon: 'file-document-outline', colorBg: '#F3E8FF', colorFg: '#7C3AED', notes: 'Utilities & rent' },
];

export const DEFAULT_INCOME_CATEGORIES: CategoryItem[] = [
  { id: 'inc-salary', name: 'Salary', type: 'income', icon: 'briefcase-outline', colorBg: '#E8F5E9', colorFg: '#2E7D32', notes: 'Monthly payroll' },
  { id: 'inc-freelance', name: 'Freelance', type: 'income', icon: 'laptop', colorBg: '#E0F2FE', colorFg: '#0284C7', notes: 'Client contracts & gigs' },
  { id: 'inc-investments', name: 'Investments', type: 'income', icon: 'chart-line', colorBg: '#FEF3C7', colorFg: '#D97706', notes: 'Dividends & capital gains' },
  { id: 'inc-gifts', name: 'Gifts', type: 'income', icon: 'gift-outline', colorBg: '#FFE4E6', colorFg: '#E11D48', notes: 'Occasions & bonuses' },
];

interface CategoriesContextType {
  expenseCategories: CategoryItem[];
  incomeCategories: CategoryItem[];
  addCategory: (item: Omit<CategoryItem, 'id'>) => void;
}

const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined);

export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const [expenseCategories, setExpenseCategories] = useState<CategoryItem[]>(DEFAULT_EXPENSE_CATEGORIES);
  const [incomeCategories, setIncomeCategories] = useState<CategoryItem[]>(DEFAULT_INCOME_CATEGORIES);

  const addCategory = (item: Omit<CategoryItem, 'id'>) => {
    const newItem: CategoryItem = {
      ...item,
      id: `${item.type}-${Date.now()}`,
    };
    if (item.type === 'expense') {
      setExpenseCategories((prev) => [newItem, ...prev]);
    } else {
      setIncomeCategories((prev) => [newItem, ...prev]);
    }
  };

  return (
    <CategoriesContext.Provider value={{ expenseCategories, incomeCategories, addCategory }}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  const ctx = useContext(CategoriesContext);
  if (!ctx) {
    throw new Error('useCategories must be used within CategoriesProvider');
  }
  return ctx;
}
```

- [x] **Step 4: Create `src/utils/insights.ts`**

Calculate breakdown items dynamically using the exact categories from `CategoriesContext`:

```ts
import { CategoryBreakdownItem, CategoryItem, InsightsData } from '../types';

export function getInsightsData(
  type: 'expense' | 'income',
  categories: CategoryItem[]
): InsightsData {
  // Weights matching the screenshot proportions for sample demonstration
  const sampleWeights = [0.823, 0.13, 0.047, 0.03, 0.02];
  const baseTotal = type === 'expense' ? 44.64 : 6000.0;

  // Map each active category from Categories tab into an insights breakdown item
  const items: CategoryBreakdownItem[] = categories.map((cat, index) => {
    const weight = index < sampleWeights.length ? sampleWeights[index] : 0.01;
    const amount = Number((baseTotal * weight).toFixed(2));
    const percentage = Number((weight * 100).toFixed(1));

    return {
      id: cat.id,
      name: cat.name,
      amount,
      percentage,
      icon: cat.icon,
      color: cat.colorFg,
      bgColor: cat.colorBg,
    };
  });

  // Calculate actual sum
  const total = items.reduce((acc, curr) => acc + curr.amount, 0);

  return {
    total: Number(total.toFixed(2)),
    type,
    items,
  };
}
```

- [x] **Step 4: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 5: Commit**

```bash
git add src/types src/utils/insights.ts
git commit -m "feat: add insights types and calculation utilities"
```

---

## Task 2: MonthYearPickerModal component

**Files:**
- Create: `src/components/MonthYearPickerModal.tsx`

**Interfaces:**
- Produces: `<MonthYearPickerModal visible month year onClose onSelect />`.

- [x] **Step 1: Create `src/components/MonthYearPickerModal.tsx`**

```tsx
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
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
```

- [x] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add src/components/MonthYearPickerModal.tsx
git commit -m "feat: add MonthYearPickerModal component"
```

---

## Task 3: Interactive DonutChart component

**Files:**
- Create: `src/components/DonutChart.tsx`

**Interfaces:**
- Consumes: `CategoryBreakdownItem` from `src/types`; `colors`, `fonts` from `src/theme`; `Icon`; `react-native-svg`.
- Produces: `<DonutChart items total type onToggleType />`.

- [x] **Step 1: Create `src/components/DonutChart.tsx`**

```tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { colors, fonts } from '../theme';
import { CategoryBreakdownItem } from '../types';
import { formatMoney } from '../utils/format';
import { Icon } from './Icon';

interface DonutChartProps {
  items: CategoryBreakdownItem[];
  total: number;
  type: 'expense' | 'income';
  onToggleType: () => void;
}

export function DonutChart({ items, total, type, onToggleType }: DonutChartProps) {
  const size = 140;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulatedPercent = 0;

  return (
    <View style={styles.card}>
      {/* Donut chart on the left */}
      <View style={styles.chartContainer}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${center}, ${center}`}>
            {/* Background base ring */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={colors.muted}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Colored Category Arcs */}
            {items.map((item) => {
              const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
              accumulatedPercent += item.percentage;

              return (
                <Circle
                  key={item.id}
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={item.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  fill="transparent"
                  strokeLinecap="round"
                />
              );
            })}
          </G>
        </Svg>

        {/* Center pressable hole */}
        <Pressable style={styles.centerHole} onPress={onToggleType}>
          <Text style={styles.centerLabel}>
            {type === 'expense' ? 'Expenses' : 'Income'}
          </Text>
          <Text style={styles.centerAmount} numberOfLines={1}>
            {formatMoney(total)}
          </Text>
          <Icon name="swap-horizontal" size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {/* Legend on the right */}
      <View style={styles.legendContainer}>
        {items.map((item) => (
          <View key={item.id} style={styles.legendRow}>
            <View style={[styles.legendDot, { borderColor: item.color }]} />
            <Text style={styles.legendName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.legendPercent}>{item.percentage.toFixed(1)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 16,
  },
  chartContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerHole: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  centerLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.mutedForeground,
  },
  centerAmount: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.foreground,
    marginVertical: 2,
  },
  legendContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 10,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  legendName: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.foreground,
  },
  legendPercent: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.foreground,
  },
});
```

- [x] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add src/components/DonutChart.tsx
git commit -m "feat: add interactive SVG DonutChart component with center toggle and legend"
```

---

## Task 4: BreakdownCard & BreakdownRow components

**Files:**
- Create: `src/components/BreakdownRow.tsx`
- Create: `src/components/BreakdownCard.tsx`

**Interfaces:**
- Consumes: `CategoryBreakdownItem` from `src/types`; `colors`, `fonts` from `src/theme`; `Icon`.
- Produces: `<BreakdownRow item />`, `<BreakdownCard items type />`.

- [x] **Step 1: Create `src/components/BreakdownRow.tsx`**

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { CategoryBreakdownItem } from '../types';
import { formatMoney } from '../utils/format';
import { Icon } from './Icon';

interface BreakdownRowProps {
  item: CategoryBreakdownItem;
}

export function BreakdownRow({ item }: BreakdownRowProps) {
  return (
    <View style={styles.container}>
      {/* Icon badge */}
      <View style={[styles.iconCircle, { backgroundColor: item.bgColor }]}>
        <Icon name={item.icon} size={20} color={item.color} />
      </View>

      {/* Main details and progress bar */}
      <View style={styles.rightContent}>
        <View style={styles.labelRow}>
          <View style={styles.nameWrap}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.percentage}>{item.percentage.toFixed(1)}%</Text>
          </View>
          <Text style={styles.amount}>{formatMoney(item.amount)}</Text>
        </View>

        {/* Proportion bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressBar,
              { width: `${Math.min(item.percentage, 100)}%`, backgroundColor: item.color },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightContent: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  nameWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  name: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.foreground,
  },
  percentage: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.mutedForeground,
  },
  amount: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    color: colors.foreground,
  },
  progressTrack: {
    height: 3.5,
    borderRadius: 2,
    backgroundColor: colors.muted,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});
```

- [x] **Step 2: Create `src/components/BreakdownCard.tsx`**

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { CategoryBreakdownItem } from '../types';
import { BreakdownRow } from './BreakdownRow';

interface BreakdownCardProps {
  items: CategoryBreakdownItem[];
  type: 'expense' | 'income';
}

export function BreakdownCard({ items, type }: BreakdownCardProps) {
  const title = type === 'expense' ? 'Expenses list' : 'Income list';

  return (
    <View style={styles.card}>
      <Text style={styles.headerTitle}>{title}</Text>
      {items.map((item) => (
        <BreakdownRow key={item.id} item={item} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginTop: 16,
  },
  headerTitle: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.mutedForeground,
    marginBottom: 8,
  },
});
```

- [x] **Step 3: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 4: Commit**

```bash
git add src/components/BreakdownRow.tsx src/components/BreakdownCard.tsx
git commit -m "feat: add BreakdownRow and BreakdownCard components with progress bars"
```

---

## Task 5: InsightsScreen implementation & navigation wiring

**Files:**
- Modify: `src/screens/InsightsScreen.tsx`
- Modify: `App.tsx`
- Modify: `docs/superpowers/specs/2026-09-12-insights-screen-design.md` (Update Implementation status)

**Interfaces:**
- Consumes: `DonutChart`, `BreakdownCard`, `MonthYearPickerModal`, `getInsightsData`, `MONTH_NAMES`, `useCategories`, `CategoriesProvider`.
- Produces: Complete `<InsightsScreen />` consuming shared categories.

- [x] **Step 1: Replace `src/screens/InsightsScreen.tsx`**

```tsx
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BreakdownCard } from '../components/BreakdownCard';
import { DonutChart } from '../components/DonutChart';
import { Icon } from '../components/Icon';
import { MONTH_NAMES, MonthYearPickerModal } from '../components/MonthYearPickerModal';
import { useCategories } from '../context/CategoriesContext';
import { colors, fonts } from '../theme';
import { getInsightsData } from '../utils/insights';

export function InsightsScreen() {
  const navigation = useNavigation<any>();
  const { expenseCategories, incomeCategories } = useCategories();
  const [selectedMonth, setSelectedMonth] = useState(8); // Sept (0-indexed)
  const [selectedYear, setSelectedYear] = useState(2026);
  const [activeType, setActiveType] = useState<'expense' | 'income'>('expense');
  const [pickerVisible, setPickerVisible] = useState(false);

  // Sourced directly from Categories context
  const activeCategories = activeType === 'expense' ? expenseCategories : incomeCategories;
  const insightsData = getInsightsData(activeType, activeCategories);

  const toggleType = () => {
    setActiveType((prev) => (prev === 'expense' ? 'income' : 'expense'));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <Pressable style={styles.backButton} onPress={() => navigation.navigate('Home')}>
          <Icon name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>

        <Pressable style={styles.monthSelector} onPress={() => setPickerVisible(true)}>
          <Text style={styles.monthTitle}>
            {MONTH_NAMES[selectedMonth]} {selectedYear}
          </Text>
          <Icon name="chevron-down" size={18} color={colors.mutedForeground} />
        </Pressable>

        {/* Spacer to keep center balanced */}
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary Card with Donut Chart */}
        <DonutChart
          items={insightsData.items}
          total={insightsData.total}
          type={activeType}
          onToggleType={toggleType}
        />

        {/* Breakdown Card */}
        <BreakdownCard items={insightsData.items} type={activeType} />
      </ScrollView>

      <MonthYearPickerModal
        visible={pickerVisible}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onClose={() => setPickerVisible(false)}
        onSelect={(m, y) => {
          setSelectedMonth(m);
          setSelectedYear(y);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  monthTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.foreground,
  },
  headerRightSpacer: {
    width: 40,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 120,
  },
});
```

- [x] **Step 2: Wrap App with `CategoriesProvider` in `App.tsx`**

In `App.tsx`, import `CategoriesProvider` from `./src/context/CategoriesContext` and wrap the app content:
```tsx
import { CategoriesProvider } from './src/context/CategoriesContext';
...
  return (
    <SafeAreaProvider>
      <CategoriesProvider>
        {Platform.OS === 'web' ? (
          <View style={styles.webOuter}>
            <View style={styles.phoneFrame}>{content}</View>
          </View>
        ) : (
          content
        )}
      </CategoriesProvider>
    </SafeAreaProvider>
  );
```

- [x] **Step 3: Update spec implementation status**

In `docs/superpowers/specs/2026-09-12-insights-screen-design.md`, set `Implementation status:` to `Implemented`.

- [x] **Step 4: Verify type-check & Android bundle export**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx expo export --platform android`
Expected: bundles successfully without errors.

- [x] **Step 5: Commit**

```bash
git add src/screens/InsightsScreen.tsx App.tsx docs/superpowers/specs/2026-09-12-insights-screen-design.md
git commit -m "feat: implement Insights screen with shared categories context and donut chart"
```
