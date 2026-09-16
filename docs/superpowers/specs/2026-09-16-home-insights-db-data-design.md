# PrettyCash — DB-backed Home & Insights (Spec)

**Date:** 2026-09-16
**Status:** Approved for implementation
**Implementation status:** Implemented

---

## 1. Overview & Objective

The Home and Insights screens still display fabricated data. Home renders mock totals (`mockBalance`, `mockMonth`, `mockUser.date`) while only its transaction list is real; Insights computes its donut/breakdown from hardcoded weights in `getInsightsData`. This work replaces all of that with figures computed from the **real transactions already fetched from Supabase**.

Computation happens **on the client** (the phone). The app already fetches transactions for the Home list, so aggregating them costs zero extra network round-trips. No edge function and no Postgres RPC — those are only warranted when the dataset is too large to load, or when aggregation must be shared/authoritative.

---

## 2. Semantics

- **Total balance** = all-time net across all transactions (`sum(income) − sum(expense)`).
- **Income / Expense** = totals for a single month.
- **Home** always uses the **current month** (the month picker is display-only for now).
- **Insights** uses a month selected via its own picker, defaulting to the current month.
- The Home header date is today's date, formatted on-device (not DB data).

---

## 3. Data Access

`src/context/TransactionsContext.tsx` already stores the raw transaction array in state but exposes only `groups`. Extend the context value to also expose the raw `transactions: Transaction[]`, so screens/utilities can aggregate without refetching. No repository or schema changes.

---

## 4. Aggregation Helpers

New module `src/utils/aggregate.ts` (pure, unit-tested):

- `currentMonthKey(now?: Date): string` → `'YYYY-MM'` from local date parts.
- `monthKey(date: string): string` → first seven characters of an ISO `YYYY-MM-DD` date.
- `monthTotals(transactions: Transaction[], ym: string): { income: number; expense: number }` — sums amounts for rows whose `monthKey(date) === ym`.
- `filterByMonth(transactions: Transaction[], ym: string): Transaction[]` — rows whose `monthKey(date) === ym`.
- `allTimeBalance(transactions: Transaction[]): number` — `sum(income) − sum(expense)` over all rows.
- `categoryBreakdown(transactions, categories, type, year, month): { total: number; items: CategoryBreakdownItem[] }` — filters to `type` and the given month, groups by `categoryId`, joins to `CategoryItem` metadata, and returns items sorted by amount descending. Percentage = `amount / total * 100` (1 decimal). A transaction whose `categoryId` is missing/empty or not found in `categories` is grouped under an `Uncategorized` bucket (`id: 'uncategorized'`, default colors). When `total === 0`, `items` is empty and no division occurs.

All money values are rounded to 2 decimals at the boundary; percentages to 1.

---

## 5. Home Screen

`src/screens/HomeScreen.tsx`:

- Header date: format today's date as `Www, Mmm D` (e.g. `Tue, Sep 9`) using a small helper; no DB.
- `MonthPicker`: pass the current month label (display-only).
- `BalanceCard`: `total = allTimeBalance(transactions)`; `income`/`expense` = `monthTotals(transactions, currentMonthKey())`.
- Daily transactions: derive the list from `filterByMonth(transactions, currentMonthKey())` grouped with the existing `groupTransactionsByDay`, rather than the context's all-time `groups`.
- Remove the `mockData` import.

`src/data/mockData.ts` is only used by `HomeScreen` and becomes unused → delete it.

---

## 6. Insights Screen

`src/utils/insights.ts`:

- Change `getInsightsData` to `getInsightsData(type, categories, transactions, year, month)` and compute the breakdown from real transactions for that month via `categoryBreakdown`. Remove the hardcoded `sampleWeights`/`baseTotal`.

`src/screens/InsightsScreen.tsx`:

- Default `selectedMonth`/`selectedYear` to the current month/year instead of `8` / `2026`.
- Pass `transactions` (from `useTransactions()`) into `getInsightsData`.
- Empty state: zero total, empty donut/breakdown; no `NaN`.

---

## 7. Error / Empty Handling

- No transactions (or none in the month) → all figures `0`, empty breakdown; the donut must not divide by zero.
- Missing/removed category on a transaction → `Uncategorized` bucket.
- The existing `loading`/`error` states in `TransactionsContext` continue to gate the screens as they do today.

---

## 8. Testing

- Unit tests for `src/utils/aggregate.ts`: month filtering, all-time balance, monthly totals, category breakdown (ordering, percentages, `Uncategorized`, zero-total guard).
- Rewritten tests for `src/utils/insights.ts` covering real-transaction aggregation and the empty case.
- `npx tsc --noEmit` and `npm test` must pass.

---

## 9. Out of Scope

- Postgres RPC / views and Supabase edge functions for aggregation.
- Home "See all" behavior and sharing a single selected month across Home and Insights.
- `public.receipt_jobs` — it is the vision backend's job table (see `2026-09-13-async-receipt-analysis-design.md`), not owned by the frontend migrations; left untouched.
- Real authentication (still deferred).
