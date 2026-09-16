# DB-backed Home & Insights — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock/fabricated numbers on Home and Insights with figures computed on-device from the real Supabase transactions.

**Architecture:** Add pure aggregation utilities (`monthKey`, `monthTotals`, `allTimeBalance`, `filterByMonth`, `categoryBreakdown`); expose the raw `transactions` array from `TransactionsContext`; wire Home (all-time balance + current-month income/expense/list) and Insights (real per-category breakdown for the selected month) to them. All computation is client-side; no edge function or RPC. Refinement vs the spec: the spec's `categoryBreakdown(..., year, month)` is realized as `categoryBreakdown(..., ym: string)` (`'YYYY-MM'`) to avoid 0-based month ambiguity.

**Tech Stack:** React Native (Expo SDK ~57), TypeScript, `@supabase/supabase-js`, `jest-expo`.

## Global Constraints

- Expo SDK `~57.0.21`/`~57.0.23`; consult https://docs.expo.dev/versions/v57.0.0/ before writing Expo code.
- No code comments in source. No new dependencies.
- `npx tsc --noEmit` and `npm test` must pass after each task.
- Aggregation is client-side only — do not add an edge function, RPC, view, or repository/schema change.
- Semantics: **Total balance = all-time net**; **Income/Expense = monthly**; **Home = current month only**; **Insights = selected month, defaulting to current**.
- Do not touch `public.receipt_jobs`.
- The working tree may contain unrelated uncommitted changes; stage only the files each task names.

**Implementation status:** Not started

---

### Task 1: Aggregation utilities

**Files:**
- Create: `src/utils/aggregate.ts`
- Test: `src/utils/__tests__/aggregate.test.ts`

**Interfaces:**
- Produces: `monthKey(date: string): string`, `currentMonthKey(now?: Date): string`, `filterByMonth(transactions: Transaction[], ym: string): Transaction[]`, `monthTotals(transactions: Transaction[], ym: string): { income: number; expense: number }`, `allTimeBalance(transactions: Transaction[]): number`, `categoryBreakdown(transactions: Transaction[], categories: CategoryItem[], type: TransactionType, ym: string): { total: number; items: CategoryBreakdownItem[] }`.

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/aggregate.test.ts`:

```ts
import { CategoryItem, Transaction } from '../../types';
import {
  allTimeBalance,
  categoryBreakdown,
  currentMonthKey,
  filterByMonth,
  monthKey,
  monthTotals,
} from '../aggregate';

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

describe('monthKey / currentMonthKey / filterByMonth', () => {
  it('derives the month key from an ISO date', () => {
    expect(monthKey('2026-09-09')).toBe('2026-09');
  });

  it('derives the current month key from a date', () => {
    expect(currentMonthKey(new Date(2026, 8, 16))).toBe('2026-09');
  });

  it('filters transactions to a month', () => {
    const list = [tx({ date: '2026-09-01' }), tx({ date: '2026-08-31' })];
    expect(filterByMonth(list, '2026-09')).toHaveLength(1);
  });
});

describe('monthTotals', () => {
  it('sums income and expense for the month only', () => {
    const list = [
      tx({ type: 'income', amount: 5200, date: '2026-09-01' }),
      tx({ type: 'expense', amount: 2140, date: '2026-09-05' }),
      tx({ type: 'income', amount: 999, date: '2026-08-01' }),
    ];
    expect(monthTotals(list, '2026-09')).toEqual({ income: 5200, expense: 2140 });
  });
});

describe('allTimeBalance', () => {
  it('nets all income minus expense', () => {
    const list = [
      tx({ type: 'income', amount: 5200, date: '2026-09-01' }),
      tx({ type: 'expense', amount: 2140, date: '2026-09-05' }),
      tx({ type: 'expense', amount: 100, date: '2026-08-01' }),
    ];
    expect(allTimeBalance(list)).toBe(2960);
  });
});

describe('categoryBreakdown', () => {
  it('groups by category, sorts descending, and computes percentages', () => {
    const categories = [cat({ id: 'c1', name: 'Food' }), cat({ id: 'c2', name: 'Shopping' })];
    const list = [
      tx({ categoryId: 'c2', amount: 13, date: '2026-09-02' }),
      tx({ categoryId: 'c1', amount: 87, date: '2026-09-03' }),
    ];
    const result = categoryBreakdown(list, categories, 'expense', '2026-09');
    expect(result.total).toBe(100);
    expect(result.items.map((i) => i.id)).toEqual(['c1', 'c2']);
    expect(result.items[0].percentage).toBe(87);
    expect(result.items[1].percentage).toBe(13);
  });

  it('buckets missing/unknown categories as Uncategorized', () => {
    const list = [tx({ categoryId: '', amount: 5, date: '2026-09-02' })];
    const result = categoryBreakdown(list, [], 'expense', '2026-09');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('uncategorized');
    expect(result.items[0].name).toBe('Uncategorized');
  });

  it('returns empty items when the month has no matching transactions', () => {
    expect(categoryBreakdown([], [], 'expense', '2026-09')).toEqual({ total: 0, items: [] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/utils/__tests__/aggregate.test.ts`
Expected: FAIL — `Cannot find module '../aggregate'`.

- [ ] **Step 3: Implement the utilities**

Create `src/utils/aggregate.ts`:

```ts
import { CategoryBreakdownItem, CategoryItem, Transaction, TransactionType } from '../types';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function currentMonthKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function filterByMonth(transactions: Transaction[], ym: string): Transaction[] {
  return transactions.filter((t) => monthKey(t.date) === ym);
}

export function monthTotals(
  transactions: Transaction[],
  ym: string,
): { income: number; expense: number } {
  const month = filterByMonth(transactions, ym);
  const income = month.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = month.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  return { income: round2(income), expense: round2(expense) };
}

export function allTimeBalance(transactions: Transaction[]): number {
  return round2(
    transactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0),
  );
}

export function categoryBreakdown(
  transactions: Transaction[],
  categories: CategoryItem[],
  type: TransactionType,
  ym: string,
): { total: number; items: CategoryBreakdownItem[] } {
  const totals = new Map<string, number>();
  for (const t of filterByMonth(transactions, ym)) {
    if (t.type !== type) continue;
    const id = t.categoryId ? t.categoryId : 'uncategorized';
    totals.set(id, (totals.get(id) ?? 0) + t.amount);
  }

  const total = round2(Array.from(totals.values()).reduce((s, v) => s + v, 0));
  if (total <= 0) return { total: 0, items: [] };

  const byId = new Map(categories.map((c) => [c.id, c]));
  const items = Array.from(totals.entries())
    .map(([id, amount]) => {
      const cat = byId.get(id);
      const rounded = round2(amount);
      return {
        id,
        name: cat?.name ?? 'Uncategorized',
        amount: rounded,
        percentage: round1((rounded / total) * 100),
        icon: cat?.icon ?? 'help-circle-outline',
        color: cat?.colorFg ?? '#6B7280',
        bgColor: cat?.colorBg ?? '#F3F4F6',
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return { total, items };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/utils/__tests__/aggregate.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Verify compile and full suite**

Run: `npx tsc --noEmit && npm test`
Expected: success.

- [ ] **Step 6: Commit**

```bash
git add src/utils/aggregate.ts src/utils/__tests__/aggregate.test.ts
git commit -m "feat: add transaction aggregation utilities"
```

---

### Task 2: Expose raw transactions from the context

**Files:**
- Modify: `src/context/TransactionsContext.tsx`

**Interfaces:**
- Produces: `useTransactions()` now also returns `transactions: Transaction[]` (the raw fetched array). `groups`, `addTransaction`, `loading`, `error` are unchanged.

- [ ] **Step 1: Add `transactions` to the context type**

In `interface TransactionsContextType`, add:

```ts
  transactions: Transaction[];
```

- [ ] **Step 2: Expose it on the provider value**

Change the provider value to include `transactions`:

```tsx
    <TransactionsContext.Provider value={{ transactions, groups, addTransaction, loading, error }}>
      {children}
    </TransactionsContext.Provider>
```

- [ ] **Step 3: Verify compile and full suite**

Run: `npx tsc --noEmit && npm test`
Expected: success. (`useTransactions()` consumers `HomeScreen` and `AddTransactionSheet` are unaffected — the addition is backward compatible.)

- [ ] **Step 4: Commit**

```bash
git add src/context/TransactionsContext.tsx
git commit -m "feat: expose raw transactions from TransactionsContext"
```

---

### Task 3: Home screen uses real data

**Files:**
- Modify: `src/utils/format.ts`
- Modify: `src/screens/HomeScreen.tsx`
- Delete: `src/data/mockData.ts`

**Interfaces:**
- Consumes: `allTimeBalance`, `currentMonthKey`, `filterByMonth`, `monthTotals` (Task 1); `transactions` from `useTransactions()` (Task 2).
- Produces: `formatHeaderDate(now?: Date): string`, `formatMonthLabel(now?: Date): string` in `src/utils/format.ts`.

- [ ] **Step 1: Add the date formatting helpers**

Append to `src/utils/format.ts`:

```ts
export function formatHeaderDate(now: Date = new Date()): string {
  return now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatMonthLabel(now: Date = new Date()): string {
  return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
```

- [ ] **Step 2: Rewire `HomeScreen`**

Replace the imports and component body in `src/screens/HomeScreen.tsx` so the screen reads:

```tsx
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BalanceCard } from '../components/BalanceCard';
import { MonthPicker } from '../components/MonthPicker';
import { TransactionGroup } from '../components/TransactionGroup';
import { useTransactions } from '../context/TransactionsContext';
import { colors, fonts } from '../theme';
import { allTimeBalance, currentMonthKey, filterByMonth, monthTotals } from '../utils/aggregate';
import { formatHeaderDate, formatMonthLabel } from '../utils/format';
import { groupTransactionsByDay } from '../utils/groupTransactions';

export function HomeScreen() {
  const { transactions } = useTransactions();
  const ym = currentMonthKey();
  const balance = useMemo(() => allTimeBalance(transactions), [transactions]);
  const totals = useMemo(() => monthTotals(transactions, ym), [transactions, ym]);
  const groups = useMemo(
    () => groupTransactionsByDay(filterByMonth(transactions, ym)),
    [transactions, ym],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brandingTitle}>PrettyCash</Text>
            <Text style={styles.date}>{formatHeaderDate()}</Text>
          </View>
        </View>

        <MonthPicker month={formatMonthLabel()} />

        <BalanceCard total={balance} income={totals.income} expense={totals.expense} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daily transactions</Text>
          <Text style={styles.seeAll}>See all</Text>
        </View>

        <View style={styles.listCard}>
          {groups.map((group) => (
            <TransactionGroup key={group.label} group={group} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

Keep the existing `StyleSheet` below the component unchanged.

- [ ] **Step 3: Delete the now-unused mock data**

Run: `git rm src/data/mockData.ts`
(`mockData` is imported only by `HomeScreen`, which no longer uses it.)

- [ ] **Step 4: Verify compile and full suite**

Run: `npx tsc --noEmit && npm test`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add src/utils/format.ts src/screens/HomeScreen.tsx
git commit -m "feat: drive Home balance and list from database transactions"
```

(The `git rm` from Step 3 is included in the same commit; `git add -A src/data/mockData.ts` if needed.)

---

### Task 4: Insights computes from real transactions

**Files:**
- Modify: `src/utils/insights.ts`
- Create: `src/utils/__tests__/insights.test.ts`
- Modify: `src/screens/InsightsScreen.tsx`
- Modify: `docs/superpowers/specs/2026-09-16-home-insights-db-data-design.md` (Implementation status)

**Interfaces:**
- Consumes: `categoryBreakdown` (Task 1); `transactions` from `useTransactions()` (Task 2).
- Produces: `getInsightsData(type: 'expense' | 'income', categories: CategoryItem[], transactions: Transaction[], ym: string): InsightsData`.

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/insights.test.ts`:

```ts
import { CategoryItem, Transaction } from '../../types';
import { getInsightsData } from '../insights';

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

describe('getInsightsData', () => {
  it('computes the breakdown from real transactions for the month and type', () => {
    const categories = [cat({ id: 'c1', name: 'Food', type: 'expense' })];
    const transactions = [
      tx({ type: 'expense', categoryId: 'c1', amount: 12.5, date: '2026-09-02' }),
      tx({ type: 'income', categoryId: 'c1', amount: 99, date: '2026-09-03' }),
    ];
    const result = getInsightsData('expense', categories, transactions, '2026-09');
    expect(result.total).toBe(12.5);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('Food');
    expect(result.items[0].percentage).toBe(100);
  });

  it('returns an empty breakdown when there are no matching transactions', () => {
    expect(getInsightsData('expense', [], [], '2026-09')).toEqual({
      total: 0,
      type: 'expense',
      items: [],
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/utils/__tests__/insights.test.ts`
Expected: FAIL — `getInsightsData` is called with 4 args but the current signature takes 2 (and the fabricated total won't be 12.5).

- [ ] **Step 3: Rewrite `getInsightsData`**

Replace the entire contents of `src/utils/insights.ts` with:

```ts
import { CategoryItem, InsightsData, Transaction } from '../types';
import { categoryBreakdown } from './aggregate';

export function getInsightsData(
  type: 'expense' | 'income',
  categories: CategoryItem[],
  transactions: Transaction[],
  ym: string,
): InsightsData {
  const { total, items } = categoryBreakdown(transactions, categories, type, ym);
  return { total, type, items };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/utils/__tests__/insights.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire `InsightsScreen` to real data and the current month**

In `src/screens/InsightsScreen.tsx`:

Add to the imports:

```ts
import { useTransactions } from '../context/TransactionsContext';
```

Replace the state defaults and the `insightsData` computation:

Replace the block that currently reads from `const { expenseCategories, incomeCategories } = useCategories();` through `const insightsData = getInsightsData(activeType, activeCategories);` with:

```tsx
  const { transactions } = useTransactions();
  const { expenseCategories, incomeCategories } = useCategories();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [activeType, setActiveType] = useState<'expense' | 'income'>('expense');
  const [pickerVisible, setPickerVisible] = useState(false);

  const activeCategories = activeType === 'expense' ? expenseCategories : incomeCategories;
  const ym = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const insightsData = getInsightsData(activeType, activeCategories, transactions, ym);
```

(Remove the previous `useState(8)`, `useState(2026)`, and `getInsightsData(activeType, activeCategories)` line. The `useCategories()` destructure moves into this replacement block.)

- [ ] **Step 6: Verify compile and full suite**

Run: `npx tsc --noEmit && npm test`
Expected: success.

- [ ] **Step 7: Mark the spec implemented**

In `docs/superpowers/specs/2026-09-16-home-insights-db-data-design.md`, set:

```
**Implementation status:** Implemented
```

- [ ] **Step 8: Commit**

```bash
git add src/utils/insights.ts src/utils/__tests__/insights.test.ts src/screens/InsightsScreen.tsx docs/superpowers/specs/2026-09-16-home-insights-db-data-design.md
git commit -m "feat: compute Insights breakdown from database transactions"
```
