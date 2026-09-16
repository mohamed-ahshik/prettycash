# PrettyCash — Home Month Picker + Auto-Jump (Spec)

**Date:** 2026-09-17
**Status:** Approved for implementation
**Implementation status:** Implemented

---

## 1. Overview & Objective

Home currently shows a display-only month pill and always scopes Income/Expense and the Daily transactions list to the **current** month. A transaction added from a receipt carries the receipt's own date (e.g. `2024-03-29`), so it increases the all-time balance but never appears in the current-month view — it looks like the save failed.

This work gives Home a **working month picker** and **auto-jumps** it to the month of a newly added transaction, so a saved receipt is immediately visible.

---

## 2. Semantics

- **Selected month** = Home's viewed month (default: current month/year).
- **Total balance** stays **all-time** net (unchanged).
- **Income / Expense** and **Daily transactions** follow the **selected** month (they must agree).
- Adding a transaction **auto-jumps** the selected month to that transaction's month.

---

## 3. Shared Month State

New `src/context/MonthContext.tsx`:

```ts
interface MonthContextType {
  month: number; // 0-11
  year: number;
  setMonth: (month: number, year: number) => void;
}
```

- `MonthProvider` holds `useState` initialised to the current month/year (`new Date()`).
- `useMonth()` throws if used outside the provider (same pattern as the other contexts).

Provider order in `App.tsx`: inside `TransactionsProvider`, wrapping `AppNavigator`, so both `HomeScreen` and `TabBar`/`AddTransactionSheet` can consume it.

---

## 4. Home Screen

`src/screens/HomeScreen.tsx`:

- Read `{ month, year, setMonth }` from `useMonth()`.
- Build `ym` as `${year}-${String(month + 1).padStart(2, '0')}`; all month-scoped values (`monthTotals`, `filterByMonth`) use `ym`.
- `formatHeaderDate()` (today's date) is unchanged; the month pill label uses `MONTH_NAMES[month]` + `year`.
- Render `MonthYearPickerModal` bound to `month`/`year`, opened from the `MonthPicker`; `onSelect` calls `setMonth`.
- Total balance remains `allTimeBalance(transactions)`.

`src/components/MonthPicker.tsx`: add an `onPress` prop and wire it to the `Pressable`.

---

## 5. Auto-Jump

`src/components/AddTransactionSheet.tsx`: after a successful `addTransaction(input)`, set the selected month/year from `input.date` (the date that was actually saved), so the new row is in view.

Helper in `src/utils/aggregate.ts`:

```ts
export function monthYearFromDate(date: string): { year: number; month: number };
```

- Parses `YYYY-MM-DD`: `year = Number(date.slice(0, 4))`, `month = Number(date.slice(5, 7)) - 1` (0-based).
- If the parsed values are not finite (invalid/short input), it falls back to the current month/year rather than returning `NaN`.

---

## 6. Insights

Unchanged. Insights keeps its own independent month state and picker.

---

## 7. Testing

- Unit test `monthYearFromDate` (valid date, and an invalid input fallback).
- `npx tsc --noEmit` and `npm test` must pass.
- Manual/on-device: switch Home months; add a receipt-dated transaction and confirm Home jumps to that month and shows the row.

---

## 8. Out of Scope

- Insights sharing the Home month state.
- Making "See all" functional.
- Changing how the receipt date is chosen (the receipt's date is kept as-is).
