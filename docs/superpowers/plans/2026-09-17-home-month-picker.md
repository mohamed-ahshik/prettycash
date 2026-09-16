# Home Month Picker + Auto-Jump — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Home a working month picker and auto-jump it to the month of a newly added transaction, so a receipt-dated transaction is immediately visible.

**Architecture:** A new `MonthContext` holds the selected month/year (`{ month, year, setMonth }`), provided above `AppNavigator`. Home reads it for the month label, Income/Expense, and the transaction list, and opens the existing `MonthYearPickerModal`. The add-transaction sheet sets the selected month from the saved transaction's date. Total balance stays all-time; Insights is untouched.

**Tech Stack:** React Native (Expo SDK ~57), TypeScript, `jest-expo`.

## Global Constraints

- Expo SDK `~57.0.21`/`~57.0.23`; consult https://docs.expo.dev/versions/v57.0.0/ before writing Expo code.
- No code comments in source. No new dependencies.
- `npx tsc --noEmit` and `npm test` must pass after each task.
- Semantics: Total balance stays **all-time**; Income/Expense and the Daily transactions list follow the **selected** month.
- Insights keeps its own independent month state — do not change it.
- The working tree may contain unrelated uncommitted changes; stage only the files each task names.

**Implementation status:** Not started

---

### Task 1: `monthYearFromDate` helper

**Files:**
- Modify: `src/utils/aggregate.ts`
- Test: `src/utils/__tests__/aggregate.test.ts`

**Interfaces:**
- Produces: `monthYearFromDate(date: string): { year: number; month: number }` (month is 0-based; falls back to the current month/year when the input doesn't start with `YYYY-MM`).

- [ ] **Step 1: Add the failing test**

Append to `src/utils/__tests__/aggregate.test.ts` (add `monthYearFromDate` to the existing import from `'../aggregate'`):

```ts
describe('monthYearFromDate', () => {
  it('parses a YYYY-MM-DD date into a 0-based month and year', () => {
    expect(monthYearFromDate('2024-03-29')).toEqual({ year: 2024, month: 2 });
  });

  it('falls back to the current month/year for an invalid input', () => {
    const now = new Date();
    expect(monthYearFromDate('not-a-date')).toEqual({
      year: now.getFullYear(),
      month: now.getMonth(),
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/utils/__tests__/aggregate.test.ts -t monthYearFromDate`
Expected: FAIL — `monthYearFromDate is not a function`.

- [ ] **Step 3: Implement**

Append to `src/utils/aggregate.ts`:

```ts
export function monthYearFromDate(date: string): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})/.exec(date);
  if (!match) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }
  return { year: Number(match[1]), month: Number(match[2]) - 1 };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/utils/__tests__/aggregate.test.ts`
Expected: PASS (all tests in the file).

- [ ] **Step 5: Verify compile and full suite**

Run: `npx tsc --noEmit && npm test`
Expected: success.

- [ ] **Step 6: Commit**

```bash
git add src/utils/aggregate.ts src/utils/__tests__/aggregate.test.ts
git commit -m "feat: add monthYearFromDate helper"
```

---

### Task 2: `MonthContext` + provider

**Files:**
- Create: `src/context/MonthContext.tsx`
- Modify: `App.tsx`

**Interfaces:**
- Produces: `MonthProvider` and `useMonth()` from `src/context/MonthContext.tsx`, where `useMonth()` returns `{ month: number; year: number; setMonth: (month: number, year: number) => void }`.

- [ ] **Step 1: Create the context**

Create `src/context/MonthContext.tsx`:

```tsx
import React, { createContext, useContext, useState } from 'react';

interface MonthContextType {
  month: number;
  year: number;
  setMonth: (month: number, year: number) => void;
}

const MonthContext = createContext<MonthContextType | undefined>(undefined);

export function MonthProvider({ children }: { children: React.ReactNode }) {
  const [month, setMonthState] = useState(() => new Date().getMonth());
  const [year, setYearState] = useState(() => new Date().getFullYear());

  const setMonth = (nextMonth: number, nextYear: number) => {
    setMonthState(nextMonth);
    setYearState(nextYear);
  };

  return (
    <MonthContext.Provider value={{ month, year, setMonth }}>
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth() {
  const ctx = useContext(MonthContext);
  if (!ctx) throw new Error('useMonth must be used within MonthProvider');
  return ctx;
}
```

- [ ] **Step 2: Provide it in `App.tsx`**

Add the import:

```ts
import { MonthProvider } from './src/context/MonthContext';
```

Wrap `AppNavigator` (inside `TransactionsProvider`):

```tsx
        <CategoriesProvider>
          <TransactionsProvider>
            <MonthProvider>
              <AppNavigator />
            </MonthProvider>
          </TransactionsProvider>
        </CategoriesProvider>
```

- [ ] **Step 3: Verify compile and full suite**

Run: `npx tsc --noEmit && npm test`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/context/MonthContext.tsx App.tsx
git commit -m "feat: add MonthContext for the selected report month"
```

---

### Task 3: Home month picker

**Files:**
- Modify: `src/components/MonthPicker.tsx`
- Modify: `src/screens/HomeScreen.tsx`

**Interfaces:**
- Consumes: `useMonth()` (Task 2); `MonthYearPickerModal`, `MONTH_NAMES` from `src/components/MonthYearPickerModal.tsx`.
- Produces: `MonthPicker` accepts an optional `onPress?: () => void`.

- [ ] **Step 1: Make `MonthPicker` pressable**

In `src/components/MonthPicker.tsx`, add `onPress` to the props and wire it:

```tsx
interface MonthPickerProps {
  month: string;
  onPress?: () => void;
}

export function MonthPicker({ month, onPress }: MonthPickerProps) {
  return (
    <Pressable style={styles.pill} onPress={onPress}>
```

(The rest of the component is unchanged.)

- [ ] **Step 2: Rewire `HomeScreen`**

In `src/screens/HomeScreen.tsx`, update the imports/body so it reads:

```tsx
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BalanceCard } from '../components/BalanceCard';
import { MonthPicker } from '../components/MonthPicker';
import { MONTH_NAMES, MonthYearPickerModal } from '../components/MonthYearPickerModal';
import { TransactionGroup } from '../components/TransactionGroup';
import { useMonth } from '../context/MonthContext';
import { useTransactions } from '../context/TransactionsContext';
import { colors, fonts } from '../theme';
import { allTimeBalance, filterByMonth, monthTotals } from '../utils/aggregate';
import { formatHeaderDate } from '../utils/format';
import { groupTransactionsByDay } from '../utils/groupTransactions';

export function HomeScreen() {
  const { transactions } = useTransactions();
  const { month, year, setMonth } = useMonth();
  const [pickerVisible, setPickerVisible] = useState(false);
  const ym = `${year}-${String(month + 1).padStart(2, '0')}`;
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

        <MonthPicker
          month={`${MONTH_NAMES[month]} ${year}`}
          onPress={() => setPickerVisible(true)}
        />

        <BalanceCard total={balance} income={totals.income} expense={totals.expense} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daily transactions</Text>
          <Text style={styles.seeAll}>See all</Text>
        </View>

        <View style={styles.listCard}>
          {groups.length === 0 ? (
            <Text style={styles.emptyText}>No transactions</Text>
          ) : (
            groups.map((group) => (
              <TransactionGroup key={group.label} group={group} />
            ))
          )}
        </View>
      </ScrollView>

      <MonthYearPickerModal
        visible={pickerVisible}
        selectedMonth={month}
        selectedYear={year}
        onClose={() => setPickerVisible(false)}
        onSelect={(m, y) => setMonth(m, y)}
      />
    </SafeAreaView>
  );
}
```

Keep the existing `StyleSheet` unchanged. (`formatMonthLabel` in `format.ts` becomes unused by Home; leave it as a general helper.)

- [ ] **Step 3: Verify compile and full suite**

Run: `npx tsc --noEmit && npm test`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/components/MonthPicker.tsx src/screens/HomeScreen.tsx
git commit -m "feat: wire Home month picker to selected month"
```

---

### Task 4: Auto-jump on add

**Files:**
- Modify: `src/components/AddTransactionSheet.tsx`
- Modify: `docs/superpowers/specs/2026-09-17-home-month-picker-design.md` (Implementation status)

**Interfaces:**
- Consumes: `useMonth()` (Task 2); `monthYearFromDate` (Task 1).

- [ ] **Step 1: Import the hook and helper**

In `src/components/AddTransactionSheet.tsx`, add:

```ts
import { useMonth } from '../context/MonthContext';
import { monthYearFromDate } from '../utils/aggregate';
```

- [ ] **Step 2: Read `setMonth` and jump after a successful save**

Inside the component, add:

```ts
  const { setMonth } = useMonth();
```

and change `handleSubmit` to:

```ts
  const handleSubmit = async (input: Omit<Transaction, 'id'>) => {
    try {
      await addTransaction({ ...input, receiptPath: receiptPath ?? undefined });
      const { year, month } = monthYearFromDate(input.date);
      setMonth(month, year);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save transaction.');
    }
  };
```

- [ ] **Step 3: Verify compile and full suite**

Run: `npx tsc --noEmit && npm test`
Expected: success.

- [ ] **Step 4: Mark the spec implemented**

In `docs/superpowers/specs/2026-09-17-home-month-picker-design.md`, set:

```
**Implementation status:** Implemented
```

- [ ] **Step 5: Commit**

```bash
git add src/components/AddTransactionSheet.tsx docs/superpowers/specs/2026-09-17-home-month-picker-design.md
git commit -m "feat: jump Home to a newly added transaction's month"
```
