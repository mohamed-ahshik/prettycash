---
title: "Receipt Analysis Retry and Idempotency"
type: spec
status: approved
date: 2026-10-24
section: receipts
tags:
  - prettycash
  - spec
  - receipts
  - retry
  - idempotency
---

# PrettyCash — Receipt Analysis Retry and Idempotency

**Date:** 2026-10-24
**Status:** Approved for implementation
**Implementation status:** Implemented — backend migration applied and live idempotency verified; frontend service/UI wiring complete with 138 tests and `tsc` passing. Manual failure-mode QA from §9.3 is outstanding.

---

## 1. Overview & Objective

The current receipt flow:
1. uploads the image to Supabase Storage,
2. POSTs it to the vision backend,
3. polls the job every second for up to 2 minutes.

A polling request can fail or hang. The current client throws immediately and loses the `jobId`, so the only recovery is for the user to scan again—which creates a second job and can leave the first one running orphaned. The enqueue POST has no idempotency key, so retrying it can also create duplicate jobs.

This feature adds:

- automatic retries for transient **polling** failures against the **same job**;
- a manual retry/resume UI when automatic retries are exhausted;
- a safe **enqueue retry** using a client-generated idempotency key;
- a backend `request_id` unique constraint so duplicate POSTs return the existing job;
- capture/request IDs that also make the storage upload idempotent.

Terminal outcomes stay unchanged: `completed`, `failed`, `rejected`, and `TIMEOUT` are not auto-retried into new jobs.

---

## 2. Locked Decisions

| Decision | Value |
|---|---|
| Retry scope | Full retry with backend idempotency. |
| Poll failures | Auto-retry against the **same job**; no new job. |
| Enqueue failures | Manual retry only, using the **same idempotency key**; safe through the backend unique constraint. |
| Job `failed` | Terminal. Manual “Try again” starts a **new analysis attempt** with a new request ID. |
| Job `rejected` | Terminal. No analysis retry; offer retake/manual. |
| Poll timeout | Offer “Keep checking” (same job) and “Start over” (new attempt). |
| Idempotency key | Client-generated request ID; stored in `receipt_jobs.request_id` unique. |
| Storage | Capture ID in the object path; upload uses upsert so retrying the same capture does not create duplicates. |
| Retry limit | 2 automatic retries per polling failure (3 attempts total), with 1s/2s backoff. |
| UI | Inline retry note while auto-retrying; a retry bar in the form after exhaustion. |
| Backend | API header, job store, one migration; no queue/worker/provider behavior changes. |
| Old clients | Requests without an idempotency key keep working as today. |

---

## 3. Scope

**In scope**

- Frontend poll retry/resume logic and UI.
- `jobId` retention on recoverable failures.
- Enqueue retry with an idempotency key.
- Backend `Idempotency-Key` header, `receipt_jobs.request_id`, unique index, and duplicate-request behavior.
- Storage upload idempotency using a capture ID.
- Automated tests and manual failure-mode QA.

**Out of scope**

- Worker/queue retries, acknowledgements, or dead-letter handling.
- Retrying `rejected` images as-is.
- Idempotency for transaction inserts, category inserts, or recurring inserts.
- Persisting an in-flight analysis across app restarts or sheet close.
- Content-hash-based deduplication of the same receipt.
- Changing the wait screen visuals beyond the retry status/actions.
- Backend user authentication or per-user API keys.

---

## 4. Definitions

- **Capture** — one selected image. A `captureId` is generated when the image is picked. It identifies the storage object.
- **Attempt** — one logical analysis submission for a capture. A `requestId` is generated when the analysis starts. It is the idempotency key.
- **Job** — the backend `receipt_jobs` row and queued work identified by `jobId`.

A retry of the same attempt reuses the capture and request IDs. A new attempt after a terminal failure gets a new `requestId`; the capture/receipt image is reused.

---

## 5. Retry State Machine

### 5.1 Poll request failure (network, 15s timeout, 408, 429, 5xx)

```
poll(jobId) fails
  → wait 1s, retry same jobId
  → fails again → wait 2s, retry same jobId
  → fails again → surface recoverable error with jobId
```

- 3 attempts total; no new POST and no new job.
- The analyzing sheet shows a small “Connection lost — retrying…” note during this sequence.
- A 4xx response is not retried (for example, 401 or a nonexistent job).
- Polling a pending job still uses the existing 1s interval and 120-attempt limit.

### 5.2 Poll exhausted / `TIMEOUT`

After 120 pending responses, the service throws `TIMEOUT` with the `jobId`.

The form shows:

- **Keep checking** — resume polling the same `jobId` for another window; no new job.
- **Start over** — new analysis attempt with the same image and a **new** `requestId`; the old job may still finish.
- **Cancel** — close.

### 5.3 Job `failed`

The job is terminal.

The form shows:

- **Try again** — start a new analysis attempt with the same image and a new `requestId`; reuse the already-uploaded receipt path.
- **Retake** — close and open the camera/gallery again.
- **Enter manually** — close the analysis and open the manual form (or let the user edit the existing form).

### 5.4 Job `rejected`

No analysis retry. The form keeps the `NOT_A_RECEIPT` banner and shows **Retake** and **Enter manually**.

### 5.5 Enqueue failure

The POST failed before a `jobId` was received. No automatic retry.

The form shows **Retry analysis**, which:

- reuses the same image, `captureId`, and `requestId`;
- re-uploads only if the receipt path is missing;
- POSTs with the same `Idempotency-Key`;
- receives either the existing job or the newly created one;
- resumes polling.

### 5.6 Success

On `completed`, the form opens with the draft and category selection, as today. The retry state is cleared.

---

## 6. Frontend Behavior and UI

### 6.1 AddTransactionSheet state

Keep the current image and IDs in refs/state while the sheet is open:

```ts
interface AnalysisAttempt {
  captureId: string;
  requestId: string;
  jobId?: string;
  image: { base64: string; mimeType: string };
  receiptPath?: string;
}
```

- Generate `captureId` when the image is received.
- Generate `requestId` when starting the analysis.
- Store the `jobId` as soon as the enqueue succeeds or a duplicate request returns it.
- Clear the attempt when the sheet closes.

### 6.2 Service contract

Add fields to options and errors:

```ts
interface AnalyzeOptions {
  requestId?: string;
  onJobId?: (jobId: string) => void;
  onPollRetry?: (retrying: boolean) => void;
  autoCategorize?: boolean;
  categories?: { id: string; name: string; description: string }[];
}

class ReceiptAnalysisError extends Error {
  code: string;
  jobId?: string;
  retryable?: boolean;
  phase?: 'enqueue' | 'poll';
}
```

Add a resume function:

```ts
resumeReceiptAnalysis(jobId: string): Promise<AnalyzedReceipt>;
```

Behavior:
- `analyzeReceipt` sends `Idempotency-Key: requestId` when provided.
- On a recoverable poll failure, it retries the same job with the backoff policy and then throws a recoverable error with `jobId` and `retryable: true` (transport failures use `NETWORK`; final 5xx responses retain the backend code/message).
- On timeout, it throws `TIMEOUT` with `jobId`.
- On `failed`, it throws `FAILED` with `jobId` and `retryable: false`.
- On `rejected`, it throws `NOT_A_RECEIPT` with `jobId` and `retryable: false`.
- `resumeReceiptAnalysis` polls the existing job; it never POSTs.

### 6.3 Retry bar

Add a themed **AnalysisRetryBar** above the `TransactionForm` when an analysis error has actions. It shows:

- a one-line status;
- the primary retry action;
- a secondary action (Start over / Retake / Enter manually) as appropriate;
- the existing error banner still shows the backend message.

Copy:

| State | Status | Primary | Secondary |
|---|---|---|---|
| Poll retries exhausted | “We lost contact while checking your receipt.” | Retry checking | Cancel |
| Timeout | “This is taking longer than usual.” | Keep checking | Start over |
| Failed | “We couldn’t read this receipt.” | Try again | Retake |
| Rejected | “This image doesn’t look like a receipt.” | Retake | Enter manually |
| Enqueue failed | “We couldn’t start the analysis.” | Retry analysis | Cancel |

- The analyzing view adds a small muted line “Connection lost — retrying…” during automatic poll retries.
- No percentages or fake stages.

### 6.4 Storage

`uploadReceipt` accepts a capture ID:

```ts
uploadReceipt(base64, mimeType, captureId)
```

- Path: `${userId}/${captureId}.${ext}`.
- Supabase `upload` uses `upsert: true`.
- Retrying the same capture does not create a second object.
- A new capture gets a new ID and path.
- The existing receipts bucket policies already include insert/update; verify upsert works for the user.

### 6.5 ID generation

Use a small local helper (no new dependency):

```ts
function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
}
```

- The backend accepts 1–128 printable characters.
- A new attempt must never reuse the previous attempt’s `requestId`.

---

## 7. Cross-Repo API Contract

### 7.1 Request

`POST /api/v1/analyze-receipt` accepts:

```
Idempotency-Key: <client-generated request id>
```

- Optional. If absent, behavior is unchanged: create a new job.
- If present, it must be 1–128 characters. Invalid values return the existing `422 UNPROCESSABLE` shape.
- The header is the only new field; the JSON body is unchanged.

### 7.2 Response

- First request with a key: create a job and return `202 {jobId, status: "pending"}`.
- Repeated request with the same key: return `202` with the **existing** `jobId` and its current status. Do not create a second row or enqueue a second job.
- If the existing job is `completed`, `failed`, or `rejected`, the client can poll it and receive the terminal result. The API still returns `202` for compatibility.

### 7.3 Backend storage

Add migration `supabase/migrations/0003_add_receipt_job_request_id.sql`:

```sql
alter table public.receipt_jobs
  add column if not exists request_id text;

create unique index if not exists receipt_jobs_request_id_key
  on public.receipt_jobs (request_id)
  where request_id is not null;
```

- Existing rows remain `NULL`.
- `SupabaseJobStore.create(request_id: str | None = None) -> CreatedJob(job_id, created)`:
  - no key: insert as today and return `created=True`;
  - key: look up by `request_id`; if found, return its id with `created=False`;
  - on insert, catch a unique violation and select the existing row (race handling).
- The API route reads the header and passes it to `create`.
- The queue payload and job contract do not change.
- No worker, classifier, provider, or queue behavior changes.

### 7.4 Backend architecture alignment

- Layers touched: API route/schema, store, migration, API/store tests.
- New column/index: `receipt_jobs.request_id` with a partial unique index.
- New API header: `Idempotency-Key`; optional and backward compatible.
- No new dependencies, queues, providers, or services.
- `ARCHITECTURE.md` must record the API contract, data model, and migration before implementation.
- The backend spec/plan must be added under `docs/specs/01-api/` and the MOCs updated.

---

## 8. Error and State Rules

- Automatic retries only for transient poll transport/5xx failures.
- No automatic retry of POST `/analyze-receipt`; manual retries reuse the key.
- No automatic new job for `TIMEOUT`; the user chooses “Start over”.
- No retry for `NOT_A_RECEIPT`.
- `FAILED` retry is a new attempt; the failed job remains in history.
- If the enqueue response is lost after the server created a job, the idempotent retry returns that job; the user does not get a second job.
- If the job is lost after dequeue by a worker crash, the client keeps polling a pending job; the current spec does not recover it. That requires a queue-ack/retry design and is out of scope.

---

## 9. Testing

### 9.1 Backend

- Same `Idempotency-Key` twice → same `jobId`, one `receipt_jobs` row, one enqueue.
- No key → two requests create two jobs (backward compatibility).
- Existing completed/failed/rejected job with the same key → returns the existing job; no enqueue.
- Invalid key length → 422 contract shape.
- Store duplicate-key race → returns one row.
- Existing API, queue, worker, classifier, and Gemini tests still pass.
- Migration applied and recorded in Supabase history.

### 9.2 Frontend

- `analyzeReceipt` sends the `Idempotency-Key` header.
- Poll network failure retries the same job twice, then throws `NETWORK` with `jobId`.
- Poll 5xx retries; 4xx does not.
- `resumeReceiptAnalysis` polls without POSTing.
- `TIMEOUT` carries `jobId`.
- `FAILED` and `NOT_A_RECEIPT` carry `jobId` and `retryable: false`.
- Enqueue retry reuses the same key and does not re-upload when a receipt path exists.
- Failed-job retry uses a new key and reuses the image.
- Upload path uses the capture ID and `upsert: true`.
- Existing tests and `tsc` pass. Current result: 24 suites / 138 tests with `npx tsc --noEmit` clean.

### 9.3 Manual QA

Manual QA status: not yet run; requires a device or simulator with controllable network/backend.

| Case | Expected |
|---|---|
| Airplane mode during polling | “Connection lost — retrying…”; then Retry checking; same job; no duplicate |
| Backend down during enqueue | Retry analysis; same key; one job |
| Job stays pending past 2 min | Keep checking resumes; Start over makes a new attempt |
| Backend job failed | Try again starts one new job; no duplicate of the failed job |
| Rejected image | Retake/Enter manually; no analysis retry |
| Close sheet during retry | Retry state is discarded; no crash |
| App background/foreground during poll | Poll resumes; no duplicate job |
| Two devices/requests with the same key | Same job (server behavior) |

---

## 10. Acceptance Criteria

1. A failed poll auto-retries the **same** job up to two times before surfacing an error.
2. Auto-retry never creates a new job.
3. Poll exhaustion offers Retry checking (same job) and Start over (new attempt).
4. Enqueue retries use the same `Idempotency-Key`; duplicate POSTs return the existing job.
5. `receipt_jobs.request_id` exists with a unique partial index.
6. The API remains backward compatible with requests that omit the header.
7. Storage paths use capture IDs and upsert so a retried capture does not duplicate the object.
8. Failed jobs can be retried as new attempts; rejected jobs cannot.
9. The form shows clear retry actions and messages for every terminal/retryable state.
10. `jobId` is retained on poll/timeout errors so the user can resume.
11. No queue/worker/provider behavior changes are required.
12. Backend and frontend automated tests pass; manual failure-mode QA passes.

---

## 11. Risks

- **Two IDs can confuse implementers.** Capture ID is for storage; request ID is for idempotency. Document both in code names.
- **Retry latency.** Poll retries add up to ~45s in the worst case (15s timeout + backoff). The UI must show that retrying is happening.
- **Duplicate old jobs.** “Start over” after a timeout can leave the original job running. This is explicit and user-triggered; show the consequence in the copy.
- **Idempotency-key reuse.** A buggy client reusing a request ID for a new image gets the old job; the service must generate a new ID for every new attempt.
- **Shared API key.** The backend cannot scope a key to a user; keys are globally unique UUID-like values. Do not use predictable values.
- **Storage upsert policies.** Verify the receipts bucket update policy allows the upsert path; otherwise use a deterministic path and ignore duplicate errors.
- **Backend first.** Deploy the header/migration before releasing the client; an old backend ignores the header and cannot dedupe.
- **Out-of-scope worker loss.** A job lost after `BRPOP` still cannot be recovered; that needs a queue-ack design.

---

## 12. Rollout

1. Backend: migration, header/store/API, tests. Header is optional, so old clients keep working.
2. Apply the migration and record it.
3. Frontend: service retries/resume/idempotency, retry UI, storage capture paths, tests.
4. Release the client.
5. Monitor duplicate-job creation and retry outcomes.
6. Follow-up: queue acknowledgements/worker retries and transaction-save idempotency as separate specs.

---

## 13. Out of Scope

- Worker/queue retry/ack/dead-letter design.
- Transaction, category, or recurring-write idempotency.
- Persisting an analysis across app restarts.
- Content-hash deduplication.
- New analyzing-screen visual concepts beyond the retry note/actions.
- Backend JWT/per-user auth.
