# 04 — Home Dashboard

Implementation status: Implemented

## Purpose

Own the default post-login screen: monthly balance, income/expense totals, month selection, and the grouped daily transaction list.

## Responsibilities

- Show the PrettyCash header and current date.
- Select a month/year and preserve it in `MonthContext`.
- Compute monthly balance, income, and expense totals.
- Group transactions by day for display.
- Hide/show monetary values consistently.
- Open transaction editing from the daily list.
- Link to the add-transaction sheet from the global tab bar.

## Main files

- `src/screens/HomeScreen.tsx` — dashboard composition.
- `src/components/BalanceCard.tsx` — balance and income/expense card.
- `src/components/MonthPicker.tsx` — month selector trigger.
- `src/components/MonthYearPickerModal.tsx` — month/year picker.
- `src/components/TransactionGroup.tsx` and `TransactionRow.tsx` — daily groups.
- `src/components/EditTransactionSheet.tsx` — edit flow entry.
- `src/context/MonthContext.tsx` — selected month/year.
- `src/utils/aggregate.ts` — totals, month filtering, combined shares.
- `src/utils/groupTransactions.ts` — grouping by day.
- `src/lib/balanceVisibility.ts` — local hide/show state.

## Data flow

```text
TransactionsContext
  → filterByMonth(transactions, YYYY-MM)
  → monthBalance / monthTotals
  → BalanceCard

filtered transactions
  → groupTransactionsByDay
  → TransactionGroup
  → TransactionRow
  → EditTransactionSheet
```

## Interaction model

- Tapping the month opens the month/year modal.
- Tapping a transaction opens the edit sheet.
- The add button is owned by the custom tab bar and opens the add flow.
- Visually hidden balances still preserve layout through masked values.

## Boundaries

- Transaction persistence is owned by module 05.
- The home screen consumes derived values; it does not write SQL directly.
- Receipt scanning is entered through the shared add button, not from the home screen itself.

## Related documentation

- [[2026-09-17-home-month-picker-design]]
- [[2026-09-18-hide-show-balance-design]]
- [[2026-09-17-home-month-picker]]
- [[2026-09-18-hide-show-balance]]
- [[architecture-index|Back to architecture index]]
