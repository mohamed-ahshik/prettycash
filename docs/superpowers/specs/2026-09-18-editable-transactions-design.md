# PrettyCash — Editable Transactions (Spec)

**Date:** 2026-09-18
**Status:** Approved for implementation
**Implementation status:** Not started

---

## 1. Overview & Objective

Saved transactions are read-only: `TransactionRow` only toggles inline line-item expansion, and the data layer exposes only `list`/`insert`. This adds the ability to **edit and delete a saved transaction** from Home by tapping its row.

---

## 2. Decisions

- **Tap a transaction row to open the editor.** The inline expand-on-tap is removed (line items are shown/edited inside the form).
- **All fields are editable:** name, amount, date, time, type (expense/income), category, note, and line items.
- **Delete is included**, with a confirmation step.
- **Editing the date does not move the month view** — Home stays on the selected month, even if the edited row leaves it.
- `receipt_path` / `receipt_data` are **preserved** on update (the receipt itself isn't re-scanned or replaced here).

---

## 3. Data Layer

### 3.1 Repository — `src/data/repositories/transactionsRepo.ts`
- `updateTransaction(id: string, input: Omit<Transaction, 'id'>): Promise<Transaction>`:
  - `update` the row's editable columns (`name`, `date`, `time`, `category_id`, `type`, `amount`, `icon`, `note`) by `id`; `receipt_path`/`receipt_data` are not written.
  - Replace line items: delete all `transaction_items` for the id, then insert the new ones (same shape/position logic as `insertTransaction`).
  - Return the mapped transaction (with the new items).
- `deleteTransaction(id: string): Promise<void>`: delete the row (items cascade via the FK).

### 3.2 Context — `src/context/TransactionsContext.tsx`
Add to the context value:
- `updateTransaction(id, input): Promise<void>` — calls the repo, then replaces the matching transaction in local state.
- `deleteTransaction(id): Promise<void>` — calls the repo, then removes the transaction from local state.

(Repo imports are aliased, e.g. `updateTransaction as updateTransactionRepo`, to avoid name collisions.)

---

## 4. Form — `src/components/TransactionForm.tsx`

New optional props so one form serves add and edit:

```ts
initialType?: TransactionType;
initialCategoryId?: string;
initialDate?: string;
title?: string;          // default 'Add Transaction'
submitLabel?: string;    // default 'Save'
onDelete?: () => void;   // when provided, render a Delete action
```

- `type` initializes to `initialType ?? 'expense'`.
- `categoryId` initializes to `initialCategoryId ?? expenseCategories[0]?.id ?? null` (an explicit `''` from an uncategorized transaction stays unselected).
- `date` initializes to `initialDate ?? todayString()` — this composes with the pending receipt-date plan (add flow passes no `initialDate` → today; edit passes the saved date).
- Title/Save label use `title`/`submitLabel`.
- When `onDelete` is provided: render a **Delete** action that switches to an inline confirmation (`Delete this transaction?` with Cancel/Delete) and calls `onDelete` on confirm. No native `Alert` (keeps web parity).
- `receiptDate` hint and month disclaimer from the pending receipt-date spec are unchanged; with no `receiptDate` on edit, the hint simply doesn't render.

---

## 5. Edit UI

- New `src/components/EditTransactionSheet.tsx`: a `Modal` (same visual language as `AddTransactionSheet`) rendering `TransactionForm` prefilled from the transaction, with:
  - `initial` from a new pure helper `toReceiptDraft(t)` (merchant←name, amount, date, time, note, items),
  - `initialType={t.type}`, `initialCategoryId={t.categoryId}`, `initialDate={t.date}`,
  - `title="Edit Transaction"`, `submitLabel="Save"`,
  - `onSubmit` → `updateTransaction(t.id, input)` then close,
  - `onDelete` → `deleteTransaction(t.id)` then close,
  - errors surfaced inline (like the add sheet).
- New pure helper `toReceiptDraft(t: Transaction): ReceiptDraft` in `src/utils/transactionDraft.ts` (unit-tested).

---

## 6. Wiring

- `TransactionRow`: remove local `expanded` state and the inline items block; the row `Pressable` calls a new `onPress?: () => void` prop.
- `TransactionGroup`: accept `onPressTransaction?: (t: Transaction) => void` and pass it to each row.
- `HomeScreen`: hold `editing: Transaction | null`; pass `onPressTransaction={setEditing}` down (via `TransactionGroup`); render `EditTransactionSheet` with the selected transaction. No month jump on save.

---

## 7. Interaction With the Pending Receipt-Date Plan

The receipt-date plan (not yet implemented) changes the form date default to `todayString()`. Both must use `initialDate ?? todayString()`:

- This spec requires that form change here.
- The receipt-date plan's Task 4 will be amended to the same initializer so the two plans don't conflict regardless of execution order.

---

## 8. Testing

- Unit-test `toReceiptDraft` (maps name/amount/date/time/note/items, handles missing items).
- Repository tests for `updateTransaction` (updates fields + replaces items) and `deleteTransaction`, using a mocked `supabase` client.
- `npx tsc --noEmit` and `npm test` must pass.
- Manual: tap a row → edit each field → save → Home reflects it; change date to another month → row leaves the current view (expected); delete with confirmation.

---

## 9. Out of Scope

- Re-scanning/replacing the receipt image or `receipt_data` while editing.
- Editing from Insights or Categories (only Home lists transactions).
- Bulk edit / multi-select.
- Undo/history for edits or deletes.
