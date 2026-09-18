# PrettyCash — Receipt Upload Date + `receipt_data` (Spec)

**Date:** 2026-09-18
**Status:** Approved for implementation
**Implementation status:** Not started

---

## 1. Overview & Objective

Two problems with receipt transactions:

1. The AI's extracted **receipt date** was used verbatim as the transaction date, so a 2024 receipt silently landed in March 2024 — invisible under the current month.
2. The analysis result is discarded after the form is filled; there is nowhere to keep extra receipt metadata.

This work makes a receipt transaction **default to the upload date (today)**, offers the receipt's date as an optional, clearly-labeled choice, and persists the **full analysis result** in a new `receipt_data jsonb` column for future use.

---

## 2. Decisions

- Receipt transaction date → **today (device date)**, field stays editable.
- If the receipt analysis returned a date, show a hint under the Date field: `Receipt date: 2024-03-29` with a **tap-to-use** action.
- When the chosen date is **outside the current month**, show a disclaimer: `This transaction will be recorded under Mar 2024.`
- Store the backend's full analysis result **verbatim** in `transactions.receipt_data` (jsonb), on the `transactions` row (no separate table).
- The receipt's date is stored only as part of `receipt_data`.

---

## 3. Schema

New frontend migration `supabase/migrations/20260918000000_add_receipt_data.sql`:

```sql
alter table public.transactions add column if not exists receipt_data jsonb;
```

Applied via `supabase db push`. Nullable; existing rows unaffected.

---

## 4. Types & Repository

- `Transaction` (`src/types/index.ts`) gains `receiptData?: unknown`.
- `src/data/repositories/transactionsRepo.ts` `insertTransaction` writes `receipt_data: input.receiptData ?? null`.
- `src/data/repositories/mappers.ts` `mapTransactionRow` maps `receiptData: row.receipt_data ?? undefined`.

No RLS changes (row-level policy already covers the column).

---

## 5. AI Service

`src/services/receiptAnalysis.ts`:

- `analyzeReceipt(imageBase64, mimeType)` now returns `{ draft: ReceiptDraft; raw: unknown }`, where `raw` is the backend's full `result` object (used for `receipt_data`), and `draft` is the normalized `ReceiptDraft` (unchanged fields).
- Error behaviour is unchanged.

---

## 6. Add Transaction Sheet

`src/components/AddTransactionSheet.tsx`:

- Keep the `raw` result in state alongside `draft`; clear both when the sheet closes.
- Pass `receiptDate={draft?.date}` to `TransactionForm`.
- On submit, attach `receiptData: raw ?? undefined` to the inserted transaction.

---

## 7. Form UX

`src/components/TransactionForm.tsx`:

- **Date defaults to today** (`todayString()`), never `initial?.date`. The field stays editable.
- New optional prop `receiptDate?: string`.
- Under the Date field, when `receiptDate` exists and differs from the current `date`, render a hint: `Receipt date: <receiptDate>` plus a **Use** action that sets the date to `receiptDate`.
- When `date`'s month (`date.slice(0, 7)`) differs from the current month, render a disclaimer: `This transaction will be recorded under <Mon YYYY>.`

New/changed files use the existing theme styles; no new dependencies.

---

## 8. Helpers & Month Names

- Centralize month names: move `MONTH_NAMES` to `src/utils/format.ts` (exported) and update `MonthYearPickerModal.tsx`, `HomeScreen.tsx`, and `InsightsScreen.tsx` to import it from there.
- Add `formatMonthFromDate(date: string): string` to `src/utils/format.ts` → e.g. `'Mar 2024'` (uses `monthYearFromDate`). Used for the disclaimer and the receipt-date hint.

---

## 9. Testing

- Update `src/services/__tests__/receiptAnalysis.test.ts` for the `{ draft, raw }` return shape (assert `raw` is the backend result and the draft is normalized).
- Unit-test `formatMonthFromDate` (valid date; invalid date falls back to the current month/year).
- Existing mapper tests extended to cover `receipt_data` → `receiptData` mapping.
- `npx tsc --noEmit` and `npm test` must pass.

---

## 10. Out of Scope

- Backend changes (it already returns the full result).
- Displaying `receipt_data` in the UI.
- Editing/backfilling `receipt_data` for existing rows.
- Deleting the existing duplicate test transactions.
