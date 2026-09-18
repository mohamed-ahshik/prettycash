# Insights Combined Donut — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Insights so the donut shows Expense (red) + Income (green) together, taps drill into a type's category colours, and both Income and Expense category lists render below.

**Architecture:** Add `combinedShares` (aggregate) and `getInsightsMonthData` (insights, replacing `getInsightsData`); rewrite `DonutChart` to be data-driven over `expense`/`income`/`drill`/`onDrill`; rewire `InsightsScreen` to hold a `drill` state, render both `BreakdownCard`s, and reset the drill on month change.

**Tech Stack:** React Native (Expo SDK ~57), TypeScript, `react-native-svg`, `jest-expo`.

## Global Constraints

- Expo SDK `~57.0.21`/`~57.0.23`; consult https://docs.expo.dev/versions/v57.0.0/ before writing Expo code.
- No code comments in source. No new dependencies.
- `npx tsc --noEmit` and `npm test` must pass after each task.
- Combined arcs use `colors.expenseText` / `colors.incomeText`; drilled arcs and rows use each category's `color`/`bgColor`.
- Insights keeps its **own** month (independent of Home) and resets `drill` when the month changes.
- The working tree may contain unrelated uncommitted changes; stage only the files each task names.

**Implementation status:** Not started

---

### Task 1: `combinedShares` + `getInsightsMonthData`

**Files:**
- Modify: `src/utils/aggregate.ts`
- Modify: `src/utils/__tests__/aggregate.test.ts`
- Modify: `src/utils/insights.ts`
- Modify: `src/utils/__tests__/insights.test.ts`

**Interfaces:**
- Produces: `combinedShares(expenseTotal, incomeTotal): { expense: number; income: number }`.
- Produces: `TypeBreakdown`, `InsightsMonthData`, and `getInsightsMonthData(transactions, categories, ym): InsightsMonthData` (replaces `getInsightsData`).

- [ ] **Step 1: Add the failing `combinedShares` test**

In `src/utils/__tests__/aggregate.test.ts`, add `combinedShares` to the import from `'../aggregate'`, then append:

```ts
describe('combinedShares', () => {
  it('splits totals into one-decimal percentages', () => {
    expect(combinedShares(10, 2990)).toEqual({ expense: 0.3, income: 99.7 });
  });

  it('returns zeros when both totals are zero', () => {
    expect(combinedShares(0, 0)).toEqual({ expense: 0, income: 0 });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest src/utils/__tests__/aggregate.test.ts -t combinedShares`
Expected: FAIL — `combinedShares is not a function`.

- [ ] **Step 3: Implement `combinedShares`**

Append to `src/utils/aggregate.ts`:

```ts
export function combinedShares(
  expenseTotal: number,
  incomeTotal: number,
): { expense: number; income: number } {
  const total = expenseTotal + incomeTotal;
  if (total <= 0) return { expense: 0, income: 0 };
  return {
    expense: round1((expenseTotal / total) * 100),
    income: round1((incomeTotal / total) * 100),
  };
}
```

- [ ] **Step 4: Replace the insights test**

Replace the entire contents of `src/utils/__tests__/insights.test.ts` with:

```ts
import { CategoryItem, Transaction } from '../../types';
import { getInsightsMonthData } from '../insights';

const tx = (over: Partial<Transaction>): Transaction => ({
  id: 't',
  name: 'x',
  date: '2026-09-09',
  time: '',
  categoryId: 'c1',
  type: 'expense',
  amount: 1,
  icon: 'receipt',
  ...over,
});

const cat = (over: Partial<CategoryItem>): CategoryItem =>
  ({
    id: 'c1',
    name: 'Food',
    type: 'expense',
    icon: 'silverware-fork-knife',
    colorBg: '#FFFFFF',
    colorFg: '#000000',
    ...over,
  }) as CategoryItem;

describe('getInsightsMonthData', () => {
  it('breaks the month into expense and income breakdowns', () => {
    const categories = [
      cat({ id: 'c1', name: 'Food', type: 'expense' }),
      cat({ id: 'c2', name: 'Salary', type: 'income' }),
    ];
    const transactions = [
      tx({ type: 'expense', categoryId: 'c1', amount: 12.5, date: '2026-09-02' }),
      tx({ type: 'income', categoryId: 'c2', amount: 100, date: '2026-09-03' }),
      tx({ type: 'expense', categoryId: 'c1', amount: 99, date: '2026-08-01' }),
    ];
    const result = getInsightsMonthData(transactions, categories, '2026-09');
    expect(result.expense.total).toBe(12.5);
    expect(result.expense.items).toHaveLength(1);
    expect(result.income.total).toBe(100);
    expect(result.income.items[0].name).toBe('Salary');
  });

  it('returns empty breakdowns for a month with no transactions', () => {
    expect(getInsightsMonthData([], [], '2026-09')).toEqual({
      expense: { total: 0, items: [] },
      income: { total: 0, items: [] },
    });
  });
});
```

- [ ] **Step 5: Run it to verify it fails**

Run: `npx jest src/utils/__tests__/insights.test.ts`
Expected: FAIL — `getInsightsMonthData is not a function`.

- [ ] **Step 6: Add the new insights helpers (keep `getInsightsData` for now)**

In `src/utils/insights.ts`, add `CategoryBreakdownItem` to the type import:

```ts
import { CategoryBreakdownItem, CategoryItem, InsightsData, Transaction } from '../types';
```

and append the new exports below the existing `getInsightsData` (leave `getInsightsData` in place so the tree stays green until Task 3):

```ts
export interface TypeBreakdown {
  total: number;
  items: CategoryBreakdownItem[];
}

export interface InsightsMonthData {
  expense: TypeBreakdown;
  income: TypeBreakdown;
}

export function getInsightsMonthData(
  transactions: Transaction[],
  categories: CategoryItem[],
  ym: string,
): InsightsMonthData {
  return {
    expense: categoryBreakdown(transactions, categories, 'expense', ym),
    income: categoryBreakdown(transactions, categories, 'income', ym),
  };
}
```

- [ ] **Step 7: Run tests and verify compile**

Run: `npx jest src/utils/__tests__/insights.test.ts src/utils/__tests__/aggregate.test.ts` then `npx tsc --noEmit && npm test`
Expected: PASS / success (the tree still compiles because `getInsightsData` remains).

- [ ] **Step 8: Commit**

```bash
git add src/utils/aggregate.ts src/utils/__tests__/aggregate.test.ts src/utils/insights.ts src/utils/__tests__/insights.test.ts
git commit -m "feat: add combined shares and monthly insights data"
```

---

### Task 2: Rewrite `DonutChart`

**Files:**
- Modify: `src/components/DonutChart.tsx`

**Interfaces:**
- Consumes: `TypeBreakdown` from `src/utils/insights.ts` (Task 1); `combinedShares` (Task 1).
- Produces: `DonutChart({ expense, income, drill, onDrill })`.

- [ ] **Step 1: Replace `DonutChart.tsx`**

Replace the entire contents of `src/components/DonutChart.tsx` with:

```tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { colors, fonts } from '../theme';
import { combinedShares } from '../utils/aggregate';
import { formatMoney } from '../utils/format';
import { TypeBreakdown } from '../utils/insights';
import { Icon } from './Icon';

interface DonutChartProps {
  expense: TypeBreakdown;
  income: TypeBreakdown;
  drill: 'expense' | 'income' | null;
  onDrill: (drill: 'expense' | 'income' | null) => void;
}

interface Arc {
  key: string;
  color: string;
  percentage: number;
  onPress?: () => void;
}

interface LegendEntry {
  key: string;
  label: string;
  percent: number;
  color: string;
  onPress?: () => void;
}

export function DonutChart({ expense, income, drill, onDrill }: DonutChartProps) {
  const size = 140;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const shares = combinedShares(expense.total, income.total);
  const isEmpty = expense.total === 0 && income.total === 0;

  const arcs: Arc[] =
    drill === null
      ? [
          { key: 'expense', color: colors.expenseText, percentage: shares.expense, onPress: () => onDrill('expense') },
          { key: 'income', color: colors.incomeText, percentage: shares.income, onPress: () => onDrill('income') },
        ]
      : (drill === 'expense' ? expense.items : income.items).map((item) => ({
          key: item.id,
          color: item.color,
          percentage: item.percentage,
        }));

  const legend: LegendEntry[] =
    drill === null
      ? [
          { key: 'expense', label: 'Expense', percent: shares.expense, color: colors.expenseText, onPress: () => onDrill('expense') },
          { key: 'income', label: 'Income', percent: shares.income, color: colors.incomeText, onPress: () => onDrill('income') },
        ]
      : (drill === 'expense' ? expense.items : income.items).map((item) => ({
          key: item.id,
          label: item.name,
          percent: item.percentage,
          color: item.color,
        }));

  const centerTitle = isEmpty && drill === null
    ? 'No data'
    : drill === null
      ? 'Tap a segment'
      : drill === 'expense'
        ? 'Expenses'
        : 'Income';
  const centerValue = drill === null
    ? undefined
    : formatMoney(drill === 'expense' ? expense.total : income.total);
  const centerOnPress = drill === null ? undefined : () => onDrill(null);

  let accumulatedPercent = 0;

  return (
    <View style={styles.card}>
      <View style={styles.chartContainer}>
        <Svg width={size} height={size}>
          <G transform={`rotate(-90 ${center} ${center})`}>
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={colors.muted}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {arcs.map((arc) => {
              const strokeDasharray = `${(arc.percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
              accumulatedPercent += arc.percentage;

              return (
                <Circle
                  key={arc.key}
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={arc.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  fill="transparent"
                  strokeLinecap="round"
                  onPress={arc.onPress}
                />
              );
            })}
          </G>
        </Svg>

        <Pressable style={styles.centerHole} onPress={centerOnPress} disabled={!centerOnPress}>
          <Text style={styles.centerLabel}>{centerTitle}</Text>
          {centerValue ? (
            <Text style={styles.centerAmount} numberOfLines={1}>{centerValue}</Text>
          ) : null}
          <Icon
            name={drill === null ? 'gesture-tap' : 'arrow-left'}
            size={16}
            color={colors.mutedForeground}
          />
        </Pressable>
      </View>

      <View style={styles.legendContainer}>
        {isEmpty && drill === null ? (
          <Text style={styles.emptyLegend}>No transactions this month</Text>
        ) : (
          legend.map((entry) => (
            <Pressable
              key={entry.key}
              style={styles.legendRow}
              onPress={entry.onPress}
              disabled={!entry.onPress}
            >
              <View style={[styles.legendDot, { borderColor: entry.color }]} />
              <Text style={styles.legendName} numberOfLines={1}>{entry.label}</Text>
              <Text style={styles.legendPercent}>{entry.percent.toFixed(1)}%</Text>
            </Pressable>
          ))
        )}
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
    textAlign: 'center',
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
  emptyLegend: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.mutedForeground,
  },
});
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: errors remaining only in `InsightsScreen.tsx` (its props/calls are updated in Task 3). `DonutChart.tsx` itself must be clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/DonutChart.tsx
git commit -m "feat: data-driven donut with income/expense drill-down"
```

---

### Task 3: Rewire `InsightsScreen` + mark the spec implemented

**Files:**
- Modify: `src/screens/InsightsScreen.tsx`
- Modify: `docs/superpowers/specs/2026-09-18-insights-combined-donut-design.md`

- [ ] **Step 1: Rewire `InsightsScreen`**

Replace the entire contents of `src/screens/InsightsScreen.tsx` with:

```tsx
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BreakdownCard } from '../components/BreakdownCard';
import { DonutChart } from '../components/DonutChart';
import { Icon } from '../components/Icon';
import { MonthYearPickerModal } from '../components/MonthYearPickerModal';
import { useCategories } from '../context/CategoriesContext';
import { useTransactions } from '../context/TransactionsContext';
import { colors, fonts } from '../theme';
import { MONTH_NAMES } from '../utils/format';
import { getInsightsMonthData } from '../utils/insights';

export function InsightsScreen() {
  const navigation = useNavigation<any>();
  const { transactions } = useTransactions();
  const { expenseCategories, incomeCategories } = useCategories();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [drill, setDrill] = useState<'expense' | 'income' | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  const ym = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const monthData = getInsightsMonthData(
    transactions,
    [...expenseCategories, ...incomeCategories],
    ym,
  );

  useEffect(() => {
    setDrill(null);
  }, [ym]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
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

        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DonutChart
          expense={monthData.expense}
          income={monthData.income}
          drill={drill}
          onDrill={setDrill}
        />

        {monthData.income.items.length > 0 ? (
          <BreakdownCard items={monthData.income.items} type="income" />
        ) : null}
        {monthData.expense.items.length > 0 ? (
          <BreakdownCard items={monthData.expense.items} type="expense" />
        ) : null}
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

- [ ] **Step 2: Remove the now-unused `getInsightsData`**

In `src/utils/insights.ts`, delete the `getInsightsData` function and drop `InsightsData` from the type import:

```ts
import { CategoryBreakdownItem, CategoryItem, Transaction } from '../types';
```

- [ ] **Step 3: Verify compile and full suite**

Run: `npx tsc --noEmit && npm test`
Expected: success.

- [ ] **Step 4: Mark the spec implemented**

In `docs/superpowers/specs/2026-09-18-insights-combined-donut-design.md`, set:

```
**Implementation status:** Implemented
```

- [ ] **Step 5: Commit**

```bash
git add src/screens/InsightsScreen.tsx src/utils/insights.ts docs/superpowers/specs/2026-09-18-insights-combined-donut-design.md
git commit -m "feat: combined income/expense Insights donut with drill-down"
```
