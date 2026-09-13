# Async Receipt Analysis (Enqueue → Poll) — Frontend Design (Spec)

**Date:** 2026-09-13
**Status:** Approved for implementation
**Implementation status:** Implemented

---

## 1. Overview & Objective

The receipt-analysis backend changed from a **synchronous** request/response to an **asynchronous job queue**: the client enqueues a job, then polls for the result. This spec covers the **frontend** changes needed to consume that flow.

The user-facing flow and the `ReceiptDraft` field set are otherwise unchanged: capture/pick a receipt → "analyzing…" → editable form (pre-filled on success, blank on failure) → save.

**Files touched (frontend only):**
- `src/services/receiptAnalysis.ts` — `analyzeReceipt` becomes enqueue → poll.
- `src/types/index.ts` — `ReceiptDraft.date`/`time` become optional.
- `src/services/__tests__/receiptAnalysis.test.ts` — update/add tests.
- `src/components/AddTransactionSheet.tsx` — verify (likely no structural change).

The backend's own concerns (rate-limiter atomicity, job-row/queue atomicity, retries/dead-letter, reliable dequeue/reaper) are **out of scope** for this spec; see §7.

---

## 2. Backend contract (as consumed by the frontend)

**Enqueue:**
```
POST {VISION_BASE_URL}/analyze-receipt
Authorization: Bearer {VISION_API_KEY}
Content-Type: application/json

{ "image": { "base64": "<base64>", "mimeType": "image/jpeg" } }
```
Response `202 Accepted`:
```json
{ "jobId": "abc-123", "status": "pending" }
```

**Poll:**
```
GET {VISION_BASE_URL}/jobs/{jobId}
Authorization: Bearer {VISION_API_KEY}
```
Response `200 OK`:
```json
{ "status": "pending" | "processing" | "completed" | "failed",
  "result": { "merchant": "...", "amount": 0, "date": "YYYY-MM-DD", "time": "HH:mm", "note": "...", "items": [] },
  "error": { "code": "UNPROCESSABLE", "message": "..." } }
```
- `result` is present only when `status === "completed"`.
- `error` is present when `status === "failed"`.

**Non-2xx** (enqueue or poll):
```json
{ "error": { "code": "UNAUTHORIZED", "message": "..." } }
```

---

## 3. Type change (`src/types/index.ts`)

`ReceiptDraft.date`/`time` become optional, since a receipt may not contain them:

```ts
export interface ReceiptDraft {
  merchant: string;
  amount: number;
  date?: string;
  time?: string;
  note: string;
  items: { name: string; quantity?: number; price: number }[];
}
```

`normalizeReceiptDraft` returns `undefined` (omits the field) when the value is absent, instead of `''`.

**Time conventions:**
- Any automated/backend-generated timestamp is **UTC** (ISO-8601).
- The app detects the **device's local timezone** and uses it for displayed times and for defaulting an absent `date`/`time` (today / now in the user's local time).

---

## 4. Service change (`src/services/receiptAnalysis.ts`)

`analyzeReceipt(imageBase64, mimeType): Promise<ReceiptDraft>` becomes:

1. **Config guard** — if `EXPO_PUBLIC_VISION_BASE_URL` / `EXPO_PUBLIC_VISION_API_KEY` are unset → `throw new ReceiptAnalysisError('NOT_CONFIGURED', ...)`.
2. **Enqueue** — `POST {baseUrl}/analyze-receipt` with the image body. On fetch failure → `NETWORK`. On non-2xx → `throw await toError(res)`. Parse `{ jobId }`.
3. **Poll** — up to **120 attempts**, 1s apart (~2 min):
   - `GET {baseUrl}/jobs/{jobId}`.
   - fetch failure → `NETWORK`; non-2xx → `throw await toError(res)`.
   - `status === 'completed'` → `return normalizeReceiptDraft(body.result)`.
   - `status === 'failed'` → `throw new ReceiptAnalysisError('FAILED', body.error?.message ?? 'Receipt analysis failed.')`.
   - otherwise (`pending`/`processing`) → wait 1s and continue.
4. **Timeout** — after 120 attempts → `throw new ReceiptAnalysisError('TIMEOUT', 'Receipt analysis timed out.')`.

Keep the existing `ReceiptAnalysisError` class (codes: `NOT_CONFIGURED`, `NETWORK`, `TIMEOUT`, `FAILED`, `INTERNAL`) and a `toError(res: Response)` helper that reads `body.error?.message` (falling back to `Request failed (${res.status})`).

`normalizeReceiptDraft` stays and is applied to the `completed` `result` (and remains the single place that shapes a raw payload into `ReceiptDraft`).

Also export a small pure helper so the banner copy is testable:

```ts
export function formatAnalysisError(e: unknown): string {
  return e instanceof ReceiptAnalysisError
    ? `${e.message} (${e.code})`
    : 'Receipt analysis failed.';
}
```

---

## 5. UI behavior (`src/components/AddTransactionSheet.tsx`)

No structural change is expected — the current `handlePicked` already:
- shows the `analyzing` spinner while `await analyzeReceipt(...)` runs (now covering the whole enqueue + poll, up to ~2 min),
- on any thrown error sets the error banner and falls back to the blank `TransactionForm`,
- discards stale results on close via `requestToken`.

**Error banner shows the message AND the code.** Change the catch in `handlePicked` to set the banner via the `formatAnalysisError(e)` helper (§4), so a `ReceiptAnalysisError` renders as the human message followed by the machine code, e.g.:

```
Could not reach the vision backend. (NETWORK)
Receipt analysis timed out. (TIMEOUT)
Receipt analysis failed. (FAILED)
```

- Format: `` `${e.message} (${e.code})` ``.
- For a non-`ReceiptAnalysisError` (unexpected) throw, fall back to the existing generic `'Receipt analysis failed.'` (no code).

Also verify:
- The "Cancel" button during `analyzing` still closes the sheet, and the in-flight poll result is discarded (existing `requestToken` guard).

---

## 6. Testing (`src/services/__tests__/receiptAnalysis.test.ts`)

- Update the `normalizeReceiptDraft` tests for optional `date`/`time` (absent → `undefined`).
- Add a `formatAnalysisError` test: a `ReceiptAnalysisError('TIMEOUT', 'Receipt analysis timed out.')` → `'Receipt analysis timed out. (TIMEOUT)'`; a plain `Error` → `'Receipt analysis failed.'`.
- Add `analyzeReceipt` tests with a mocked `fetch`:
  - **completed**: enqueue → `{ jobId }`; first poll → `{ status: 'completed', result }` → resolves to the normalized draft.
  - **failed**: poll → `{ status: 'failed', error: { message } }` → rejects with `ReceiptAnalysisError` code `FAILED`.
  - **timeout**: poll always `pending` → rejects with code `TIMEOUT` (use fake timers to avoid a real 2-minute wait).
  - **not configured**: env unset → rejects with code `NOT_CONFIGURED`.

---

## 7. Out of scope (backend responsibilities, recorded for context)

These were identified on the backend and are NOT frontend changes; the frontend accommodates them by polling with a bounded timeout and surfacing failures:

- **Rate limiter `INCR` + `EXPIRE` non-atomic** — a crash between the two commands leaves a TTL-less key → permanently rate-limited. Backend should use an atomic step (Lua `EVAL`, or `SET NX EX` + `INCR`).
- **`create()` + `enqueue()` not atomic** — a job row can be created without a queue entry (Redis down), stranding a `pending` row the worker never sees. Backend mitigation: a sweeper that fails stale `pending` rows, or enqueue-first + idempotency.
- **No retry / dead-letter** — a transient Gemini failure marks the job `failed` with no retry. Backend: retry-with-backoff + a dead-letter list (spec §4 originally scoped retries out).
- **Worker `mark_processing` failure strands a job** — `BRPOP` is destructive before `mark_processing`; if Supabase is down the job is gone from Redis but still `pending`. Backend: reliable-queue pattern (`RPOPLPUSH` to a processing list, ack on completion) or a reaper for stale rows.

---

## 8. Acceptance criteria

- `analyzeReceipt` enqueues, then polls `GET /jobs/{jobId}` every 1s up to 120 attempts, returning the normalized `ReceiptDraft` on `completed`.
- `failed` → `ReceiptAnalysisError('FAILED', message)`; timeout → `ReceiptAnalysisError('TIMEOUT', ...)`; missing config → `NOT_CONFIGURED`; transport/HTTP errors → `NETWORK`/`INTERNAL`.
- `ReceiptDraft.date`/`time` are optional; absent values are `undefined`.
- The add-transaction flow keeps the spinner during the whole poll and, on failure, falls back to the blank form with an error banner that shows **both** the message and the code (e.g. `Receipt analysis timed out. (TIMEOUT)`).
- `npx tsc --noEmit` and `npm test` pass.
