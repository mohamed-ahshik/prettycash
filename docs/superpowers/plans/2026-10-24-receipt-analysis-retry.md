---
title: "Receipt Analysis Retry and Idempotency Implementation Plan"
type: plan
status: approved
date: 2026-10-24
section: receipts
tags:
  - prettycash
  - plan
  - receipts
  - retry
  - idempotency
---

# PrettyCash — Receipt Analysis Retry Implementation Plan

**Implementation status:** Implemented — 139 tests and `tsc` pass; web QA covered poll loss, enqueue loss, forced failure, and rejection. Timeout UI is component-tested; on-device background/close/retake QA pending.

## Related

- Spec: [[2026-10-24-receipt-analysis-retry-design|Receipt Analysis Retry and Idempotency]]
- Backend spec: `PrettyCash-Backend/docs/specs/01-api/2026-10-24-receipt-analysis-idempotency-design.md`
- Architecture: `docs/ARCHITECTURE.md`

**Goal:** Keep the analysis job recoverable across poll failures, add a retry/resume UI, make enqueue retries idempotent, and make storage uploads idempotent per capture.

**Tech Stack:** React Native, Expo, TypeScript, Jest, Supabase Storage.

## Tasks

- [x] Extend `ReceiptAnalysisError` with `jobId`, `retryable`, and `phase`.
- [x] Add poll auto-retries (3 attempts, 1s/2s backoff) and `onPollRetry`.
- [x] Send `Idempotency-Key` from `requestId` and report `onJobId`.
- [x] Add `resumeReceiptAnalysis(jobId)`.
- [x] Add `captureId` storage paths and `upsert: true`.
- [x] Add `AnalysisRetryBar`.
- [x] Refactor `AddTransactionSheet` to retain the attempt, job, and image.
- [x] Wire retry/resume/start-over/retake/manual actions.
- [x] Add service, storage, and timeout component tests.
- [x] Update the spec and plan implementation status.
- [x] Run `tsc` and `npm test`.
- [ ] Finish on-device background/close-sheet/retake QA; web failure-mode QA passed for the covered cases.

## Verification

```bash
cd /Users/user/Documents/PrettyCash
npx tsc --noEmit
npm test -- --runInBand
```
