# 05 — Transactions

Implementation status: Implemented

## Purpose

Own the transaction domain end-to-end: manual entry, editing, deletion, line items, transaction grouping, and the split add button interaction.

## Responsibilities

- Provide add/edit transaction forms.
- Validate amount, name, category, date, and time.
- Persist transactions and optional receipt line items.
- Update the local transaction context after writes.
- Support editable transactions by tapping a row.
- Split the add action into manual entry and receipt capture/gallery.
- Maintain transaction history for home, insights, and recurring processing.

## Main files

- `src/components/TransactionForm.tsx` — shared create/edit form.
- `src/components/AddTransactionSheet.tsx` — create sheet with manual/AI modes.
- `src/components/EditTransactionSheet.tsx` — edit sheet.
- `src/components/TransactionRow.tsx` / `TransactionGroup.tsx` — list presentation.
- `src/components/SplitAddButton.tsx` — camera tap + gallery hold interaction.
- `src/components/TabBar.tsx` — hosts the add action.
- `src/context/TransactionsContext.tsx` — state, CRUD, refresh.
- `src/data/repositories/transactionsRepo.ts` — Supabase CRUD.
- `src/utils/aggregate.ts` — totals and monthly shares.
- `src/utils/groupTransactions.ts` — day grouping.

## Create flow

```text
Tab bar add action
  → AddTransactionSheet
  → TransactionForm
  → TransactionsContext.addTransaction
  → transactionsRepo.insertTransaction
  → Supabase transactions (+ transaction_items)
  → local state update
```

## Edit/delete flow

```text
TransactionRow press
  → EditTransactionSheet
  → TransactionsContext.updateTransaction / deleteTransaction
  → transactionsRepo
  → Supabase
  → local state reconciliation
```

## Receipt integration

The add sheet can be entered with `initialImage` or receipt data. The receipts/AI module owns extraction; this module owns converting the draft into a transaction and persisting it.

## Validation and state

- Name and amount are required.
- Category selection follows expense/income type.
- Optional item rows support receipt line items.
- Writes update context immediately after a successful Supabase response.
- Errors are surfaced through context and form-level errors.

## Boundaries

- Transactions do not own categories or receipt analysis; they consume them.
- Recurring transactions are created server-side through module 09 and appear here as normal transactions.
- Analytics capture is side-effect logging only.

## Related documentation

- [[2026-09-18-editable-transactions-design]]
- [[2026-10-24-split-add-button-design]]
- [[2026-09-18-editable-transactions]]
- [[2026-10-24-split-add-button]]
- Cross-module: [[2026-09-13-add-transaction-ai-receipt-design]]
- [[architecture-index|Back to architecture index]]
