---
title: "Analyzing Stages and Failure Recovery"
type: spec
status: approved
date: 2026-10-25
section: receipts
tags:
  - prettycash
  - spec
  - receipts
  - analyzing
  - retry
---

# PrettyCash — Analyzing Stages and Failure Recovery

**Date:** 2026-10-25
**Status:** Approved
**Implementation status:** Implemented — three-stage progress, inline failure recovery, animated/reduced-motion progress, and 152 passing tests; `tsc` passes. Manual web/device QA pending.

---

## Related

- Retry design: [[2026-10-24-receipt-analysis-retry-design|Receipt Analysis Retry and Idempotency]]
- Split add design: [[2026-10-24-split-add-button-design|Split Add Button]]
- Prototype reviewed: standalone `analyzing.html` (local design review, not committed)
- Existing code: `src/components/AddTransactionSheet.tsx`, `src/components/AnalysisProgress.tsx`, `src/components/AnalysisErrorCard.tsx`, `src/components/TabBar.tsx`

## 1. Overview & Objective

The analyzing sheet currently shows a looping scan box, “Reading receipt…”, and then opens an empty manual form for any analysis failure. The design prototype added a receipt thumbnail and four technical stages (upload, receipt check, item reading, category selection), which exposed more of the pipeline than users need.

This change:

- keeps the receipt thumbnail and a sense of progress;
- reduces the visible story to three broad stages;
- keeps **every analysis failure** in the analyzing sheet with a clear recovery card;
- opens the manual form only after success or when the user explicitly chooses manual.

## 2. Locked Decisions

| Decision | Value |
|---|---|
| Visible stages | Exactly three: Sending receipt, Reading receipt, Finishing up. |
| Hidden internals | Receipt checking, item/total extraction, category selection, and backend status are not separate stages. |
| Pacing | Sending until upload + enqueue succeeds; Reading while polling; Finishing up after 6s if still waiting. |
| Slow wait | At 15s the time pill becomes “Taking longer” and the hint admits the wait; the stage remains Finishing up. |
| Sending flash | No artificial minimum; Sending may be brief. |
| Resume | Preserve elapsed job time; resume at the stage the job had reached. |
| Progress | Indeterminate bar and stage dots; no percentage and no countdown. |
| Receipt visual | Show the captured receipt image as a thumbnail in progress and error states. |
| Error placement | Every analysis failure stays in the analyzing sheet; the manual form is never opened automatically. |
| Error actions | Context-specific retry/replace actions plus Enter manually and close. |
| backend | No API, queue, worker, database, or migration changes. |
| dependencies | No new dependencies. |

## 3. Scope

**In scope**

- Replace the scan box with a receipt thumbnail, three-stage list, and indeterminate progress bar.
- Add the hybrid stage timeline, 6-second finishing threshold, and 15-second slow-wait state.
- Add one inline error card for upload, enqueue, poll, timeout, rejected, and failed outcomes.
- Wire retry, start over, scan again, choose another photo, enter manually, and close.
- Remove `AnalysisRetryBar` and the analysis form handoff; the form keeps only save errors.
- Component tests and manual QA.

**Out of scope**

- Changes to the analysis service, retry state machine, backend job statuses, queue, or provider.
- Real percentages or server-provided stage events.
- Persisting an in-flight analysis across app restarts or sheet close.
- Automatic retry of a rejected image as-is.
- Saving a draft of the failed analysis.

## 4. Analyzing Screen

```
[ Scanning ]                         [ ~5–10s ]

Reading your receipt

[receipt thumbnail]   ✓ Sending receipt
                      ● Reading receipt
                      ○ Finishing up

[ indeterminate progress bar ]

Usually a few seconds. You can cancel if it takes too long.
[ Cancel ]
```

- Eyebrow: `Scanning`.
- Title: `Reading your receipt`.
- Time pill: `~5–10s`; after 15s of waiting it becomes `Taking longer`.
- Thumbnail: the captured receipt image, portrait ratio, subtle rotation/shadow as in the prototype.
- Stage dots: done = check; active = pulsing dot; pending = empty.
- Progress bar: indeterminate; no percentage.
- Hint: `Usually a few seconds. You can cancel if it takes too long.` After 15s: `This is taking a little longer than usual.`
- Cancel remains.
- `Connection lost — retrying…` remains as a small note during automatic poll retries.
- Removed: scan box/scan line, “Checking it’s a receipt”, “Reading items & total”, “Choosing a category”.

## 5. Stage State Machine

```ts
type AnalysisStage = 'sending' | 'reading' | 'finishing';
```

### New attempt

1. Start at `sending` when the analyzing sheet opens.
2. Keep `sending` while the receipt uploads and the enqueue request is in flight.
3. When the enqueue returns a `jobId`, store `jobStartedAt`, switch to `reading`, and start the thresholds below.
4. At 6 seconds after `jobStartedAt`, switch to `finishing`.
5. At 15 seconds after `jobStartedAt`, change the pill to `Taking longer` and the hint to the slow-wait copy.
6. `finishing` remains active until a terminal outcome.

- The stage never moves backward within an attempt.
- A fast upload may make `sending` brief; there is no artificial delay.
- Threshold timers are cleared on completion, failure, timeout, close, or new attempt.

### Resume and retry

- Resume after a poll error or timeout (Retry checking / Keep checking): compute elapsed from
  `jobStartedAt` and show the matching stage immediately. If the job is already past 6s, resume at
  Finishing up; past 15s, show the slow-wait copy immediately. No restart from Reading, no new POST,
  no new job.
- Enqueue retry (Retry analysis): start at `sending`; reuse the same request ID and skip the upload
  when the receipt path exists.
- Start over after timeout: new request ID, same image; start at `sending`; the old job may still finish.
- Retry upload: reuse the same capture ID and request ID; start at `sending`.
- Failed Try again: new request ID with the same image; start at `sending`.
- Rejected/failed: stages stop; the inline error card replaces them.

## 6. Error Card

Every analysis failure replaces the stages and progress bar with one card layout:

```
[!]  SCANNING
     <title>                                      [x]

[thumbnail]  <explanation>

[ primary action ]
[ secondary action ]
      Enter manually
```

The card always shows the captured receipt thumbnail and friendly copy. It never shows the
technical error code, backend message, percentage, or stage list.

### Variants

| Kind | Title | Explanation | Primary | Secondary |
|---|---|---|---|---|
| Upload | Couldn’t send receipt | Check your connection and try again. | Retry upload | Choose another photo |
| Enqueue | Analysis didn’t start | The receipt is still on this device. Retry starting the analysis. | Retry analysis | — |
| Poll | Lost connection | We couldn’t check the result. The same job is still waiting. | Retry checking | — |
| Timeout | Still reading | This is taking longer than usual. Keep checking or start over. | Keep checking | Start over |
| Rejected | Not a receipt | This photo doesn’t look like a receipt. Try a clearer shot or choose another photo. | Scan again | Choose another photo |
| Failed | Couldn’t read this receipt | Something went wrong while reading it. Try again, or use a different photo. | Try again | Scan again / Choose another photo |

- **Add Try again for failed:** same image, same capture ID, new request ID, new job.
- **Rejected** has no Try again.
- **Scan again** closes the sheet and opens the camera.
- **Choose another photo** closes the sheet and opens the gallery.
- **Enter manually** opens the manual form without attaching the failed image and clears the attempt.
- **Close X / backdrop / swipe down** closes the sheet.
- **Start over** after timeout uses the same image with a new request ID.

## 7. Failure Routing

`AddTransactionSheet` gains a third flow: `analyzing | error | form`.

| Failure | Error kind | Source |
|---|---|---|
| Upload failure | `upload` | `uploadReceipt` rejection |
| Enqueue/network/5xx/4xx before job exists | `enqueue` | `analyzeReceipt` with `phase: 'enqueue'` or no phase |
| Poll/network/5xx/4xx after job exists | `poll` | `phase: 'poll'` |
| 120 pending responses | `timeout` | `TIMEOUT` with `jobId` |
| Not a receipt | `rejected` | `NOT_A_RECEIPT` |
| Job failed | `failed` | `FAILED` |

- The form flow is entered only on `completed` or Enter manually.
- The form’s `error` prop is reserved for save failures.
- The retry bar is removed.
- The retry spec’s §5.3/§5.4 and §6.3 UI placement and failed/rejected copy are superseded by this
  spec; the underlying retry/error semantics remain.
- `AnalysisRetryBar.tsx` and `AnalysisRetryKind` are removed.

## 8. Components and Props

- **`AnalysisProgress`** (new, presentational)
  - Props: `image`, `stage`, `slowWait`, `reconnecting`, `onCancel`.
  - Renders thumbnail, title, time pill, stages, progress, hint, Cancel.
  - Owns no network logic.
- **`AnalysisErrorCard`** (new, presentational)
  - Props: `kind`, `image`, and action callbacks for the variant.
  - Renders the receipt thumbnail, title, explanation, actions, and close.
- **`AddTransactionSheet`**
  - Owns `stage`, `jobStartedAt`, `slowWait`, `analysisErrorKind`, and threshold timers.
  - New prop: `onChoosePhoto?: () => void`.
  - Existing `onRetake` is used by Scan again; `onClose` by close.
  - New retry handlers: retry upload, retry analysis, retry checking, start over, try again.
  - `Enter manually` calls the existing manual reset and sets `flow='form'`.
- **`TabBar`**
  - Add a `chooseAnother` helper that closes the sheet, remounts it, and opens the gallery.
  - Pass `onChoosePhoto`; existing camera retake remains.
- **`AnalysisRetryBar.tsx`** removed.

## 9. Visual Details

- Use existing theme colors, `fonts`, and `radii`; no new palette.
- Stage active dot pulses; done dot shows a check; pending dot is an outline.
- The progress bar uses an indeterminate loop; under reduced motion, show a static bar and no pulse.
- The thumbnail uses the receipt image as `data:${mimeType};base64,...`; if unavailable, show a receipt icon placeholder.
- Keep the existing bottom-sheet animation and gesture dismissal.
- The analyzing/error sheet uses the existing tall sheet height so the failed card's four actions do
  not clip; the progress view may use the shorter height.
- Error actions must meet existing mobile hit targets; the failed card may stack the two secondary
  replacement actions.

## 10. Tests

- Stage progression:
  - New attempt starts at sending; job ID switches to reading; 6s to finishing; 15s to slow-wait.
  - Fast enqueue may skip the visible active sending state but still marks it done.
  - Completion opens the form and clears stages.
- Resume:
  - Resume at 3s shows Reading; resume at 20s shows Finishing + slow-wait immediately.
  - Enqueue retry starts at Sending; timeout Start over starts at Sending.
- Failure routing:
  - Every failure kind maps to the correct card copy/actions.
  - Rejected/failed do not open the form.
  - Try again on failed uses the same image and a new request ID.
  - Enter manually opens a form with no attached receipt.
  - Scan again / Choose another photo call the parent callbacks.
  - Close clears timers.
- Threshold timers are cleaned up on unmount, completion, error, and retry.
- Form save errors still render the existing error banner.
- Existing retry/service tests remain green; update or remove tests that expected
  `AnalysisRetryBar` failed/rejected variants.
- Manual QA: slow job, resume after timeout, all six error variants, manual fallback, reduced motion.

## 11. Acceptance Criteria

1. The analyzing sheet shows only the three approved stages.
2. Technical checks and category selection are never separate stages.
3. The timeline is Sending → Reading → Finishing up, with 6s/15s thresholds.
4. Resume preserves the elapsed stage timeline.
5. The receipt thumbnail is visible while processing and in every error state.
6. Every analysis failure stays in the analyzing sheet with a recovery card.
7. Rejected has Scan again / Choose another photo / Enter manually; failed adds Try again.
8. The manual form opens only after completion or an explicit manual choice.
9. Transient retries keep the same job; failed Try again creates a new job with the same image.
10. No backend or dependency changes.
11. Automated tests and `tsc` pass; manual QA covers the new states.

## 12. Risks

- **Pacing can imply progress that is not real.** Stages are visual cues; the slow-wait copy and
  pill correction reduce false expectations.
- **Failed cards have several actions.** Try again is primary; replacement and manual actions are
  secondary to keep the visual hierarchy.
- **Resume timestamps depend on client time.** Use a monotonic local timestamp; elapsed time is a
  presentation heuristic, not backend truth.
- **Manual fallback drops the failed image.** This is intentional: the image was unreadable or the
  analysis failed; manual entry creates a clean transaction.
