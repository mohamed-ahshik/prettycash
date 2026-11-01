# 06 — Receipts and AI

Implementation status: Implemented

## Purpose

Own receipt capture, upload, AI extraction, asynchronous analysis, retry/recovery, receipt metadata, and receipt-driven category suggestions.

## Responsibilities

- Request camera/library permissions and pick receipt images.
- Encode and send receipt images to the PrettyCash vision backend.
- Support asynchronous enqueue/poll analysis.
- Show staged progress: sending, reading, finishing.
- Handle failures, slow waits, reconnects, rejection, and retries.
- Extract merchant, amount, date, items, and category.
- Auto-categorize using the user’s categories.
- Save receipt data and receipt path on transactions.

## Main files

- `src/hooks/useReceiptPicker.ts` — camera/gallery permissions and launch.
- `src/services/receiptPicker.ts` — image normalization/base64.
- `src/services/receiptAnalysis.ts` — upload/enqueue/poll/retry client.
- `src/components/AnalysisProgress.tsx` — staged progress UI.
- `src/components/AnalysisErrorCard.tsx` — failure/recovery UI.
- `src/components/AddTransactionSheet.tsx` — receipt draft to transaction transition.
- `src/config.ts` — vision backend URL derivation and API key.
- `src/utils/categorySelection.ts` — category choice/auto-categorization helpers.
- Backend dependency: `EXPO_PUBLIC_VISION_BASE_URL`, `EXPO_PUBLIC_VISION_API_KEY`.

## Analysis flow

```text
Camera / gallery
  → PickedReceiptImage
  → POST receipt to vision backend
  → async job / request_id
  → poll or wait for result
  → ReceiptDraft
  → prefill TransactionForm
  → TransactionsContext.addTransaction
```

## Failure model

- Upload failure → retry upload.
- Enqueue failure → retry analysis start.
- Poll failure → retry checking / reconnect state.
- Timeout → keep checking or start over.
- Rejected receipt → scan again, choose another photo, or enter manually.
- Retry uses the same image and idempotency semantics to avoid duplicate jobs.

## Receipt data

Transactions can retain:

- `receipt_path` for the stored image,
- `receipt_data` for the structured extraction,
- line items,
- extracted date/time,
- category hints and confidence.

## Boundaries

- Receipt analysis does not directly write transactions; it produces drafts and progress/error states.
- The data platform owns storage and transaction rows.
- Categories module owns category CRUD and coloring.

## Related documentation

- [[2026-09-13-add-transaction-ai-receipt-design]]
- [[2026-09-13-async-receipt-analysis-design]]
- [[2026-09-18-receipt-date-and-receipt-data-design]]
- [[2026-10-24-auto-categorization-design]]
- [[2026-10-24-receipt-analysis-retry-design]]
- [[2026-10-25-analyzing-stages-design]]
- [[2026-09-13-add-transaction-ai-receipt]]
- [[2026-09-18-receipt-date-and-receipt-data]]
- [[2026-10-24-auto-categorization]]
- [[2026-10-24-receipt-analysis-retry]]
- [[2026-10-25-analyzing-stages]]
- [[architecture-index|Back to architecture index]]
