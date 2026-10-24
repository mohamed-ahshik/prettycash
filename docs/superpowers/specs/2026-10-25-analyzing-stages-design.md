---
title: "Analyzing Stages and Unreadable Receipt State"
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

# PrettyCash — Analyzing Stages and Unreadable Receipt State

**Date:** 2026-10-25
**Status:** Approved
**Implementation status:** Not started

---

## Related

- Retry design: [[2026-10-24-receipt-analysis-retry-design|Receipt Analysis Retry and Idempotency]]
- Split add design: [[2026-10-24-split-add-button-design|Split Add Button]]
- Prototype reviewed: standalone `analyzing.html` (local design review, not committed)
- Existing code: `src/components/AddTransactionSheet.tsx`, `src/components/AnalysisRetryBar.tsx`, `src/components/TabBar.tsx`

## 1. Overview & Objective

The analyzing sheet currently shows a looping scan box and “Reading receipt…”. The design prototype added a receipt thumbnail and four technical stages (upload, receipt check, item reading, category selection), which exposes more of the backend pipeline than users need.

This change keeps the receipt thumbnail and sense of progress, but reduces the visible story to **three broad stages**:

1. **Sending receipt**
2. **Reading receipt**
3. **Finishing up**

It also keeps terminal **rejected** and **failed** receipts inside the analyzing sheet. Today both fall through to the manual form with a retry bar. The new error card shows the receipt and offers **Scan again**, **Choose another photo**, or **Enter manually**.

## 2. Locked Decisions

| Decision | Value |
|---|---|
| Visible stages | Exactly three: Sending receipt, Reading receipt, Finishing up. |
| Hidden internals | Receipt checking, item/total extraction, category selection, and backend status are not separate stages. |
| Pacing | Hybrid: Sending until upload + enqueue succeeds; Reading while polling; Finishing up after 6s if still waiting. |
| Progress | Indeterminate bar and stage dots; no percentage and no countdown. |
| Receipt visual | Show the captured receipt image as a thumbnail in progress and error states. |
| Terminal receipt errors | `NOT_A_RECEIPT` and `FAILED` stay in the analyzing sheet as an inline error card. |
| Error actions | Scan again (camera), Choose another photo (gallery), Enter manually, and close. |
| Manual form | No automatic handoff for rejected/failed receipts; it opens only via Enter manually (or the pencil elsewhere). |
| Transient errors | Upload/enqueue failures, polling failures, and timeouts keep the existing form + retry bar behavior. |
| backend | No API, queue, worker, database, or migration changes. |
| dependencies | No new dependencies. |

## 3. Scope

**In scope**

- Replace the scan box with a receipt thumbnail, stage list, and indeterminate progress bar.
- Add the three-stage state machine and 6-second pacing.
- Add an inline unreadable-receipt error card for `NOT_A_RECEIPT` and `FAILED`.
- Wire Scan again / Choose another photo / Enter manually / close to the existing picker and form flows.
- Remove the failed/rejected variants from `AnalysisRetryBar` and their form state.
- Component tests and on-device visual QA.

**Out of scope**

- Changes to the retry state machine for upload/enqueue/poll/timeout.
- Backend analysis, prompts, queue behavior, or job statuses.
- A real percentage or server-provided stage events.
- Persisting an in-flight analysis across app restarts or sheet close.
- Automatic retry of a rejected image as-is.

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
- Time pill: `~5–10s` (static).
- Thumbnail: the captured receipt image, portrait ratio, subtle rotation/shadow as in the prototype.
- Stage dots: done = check; active = pulsing dot; pending = empty.
- Progress bar: indeterminate; no percentage.
- Hint: `Usually a few seconds. You can cancel if it takes too long.`
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
3. When the enqueue returns a `jobId`, switch to `reading` and start a 6-second timer.
4. If the timer fires while the job is still pending, switch to `finishing`.
5. `finishing` remains active until `completed`, `failed`, or `rejected`.

- The stage never moves backward within an attempt.
- A fast upload may make `sending` brief; no artificial minimum duration.
- The 6-second timer is cleared on completion, failure, timeout, close, or a new attempt.

### Resume and retry

- Resume after a poll error / timeout (“Retry checking” / “Keep checking”): start at `reading`; start the 6-second timer.
- Enqueue retry (“Retry analysis”): start at `sending`; it may skip the upload if the receipt path already exists.
- “Start over” after timeout: new attempt; start at `sending`.
- Rejected/failed: stages stop; the inline error card replaces them.
- Transient failures before a job exists: existing form + retry bar; no stage animation is required.

## 6. Unreadable Receipt Error

`NOT_A_RECEIPT` and `FAILED` do not open the manual form automatically. They replace the stage list and progress bar with:

```
[!]  SCANNING
     Not a receipt                                  [x]

[thumbnail]  This photo doesn’t look like a receipt.
             Try a clearer shot or choose another photo.

[ Scan again ]
[ Choose another photo ]
      Enter manually
```

- **Rejected** (`NOT_A_RECEIPT`)
  - Title: `Not a receipt`
  - Body: `This photo doesn’t look like a receipt. Try a clearer shot or choose another photo.`
- **Failed** (`FAILED`)
  - Title: `Couldn’t read this receipt`
  - Body: `Something went wrong while reading it. Try a clearer shot or choose another photo.`
- Both show the captured receipt thumbnail.
- Primary: `Scan again` → close the sheet and open the system camera.
- Secondary: `Choose another photo` → close the sheet and open the gallery.
- Text: `Enter manually` → open the manual form without attaching the rejected/failed image.
- Close X / backdrop / swipe down → close the sheet.
- No stages, progress bar, percentage, error code, or backend message in this card.
- No same-image “Try again” button; choosing the same photo again from the gallery starts a new attempt.

## 7. Retry Integration

- The existing retry bar remains for `enqueue`, `poll`, and `timeout`.
- `failed` and `rejected` are removed from `AnalysisRetryBar` and `AnalysisRetryKind`.
- `AddTransactionSheet` gains a third flow: `analyzing | unreadable | form`.
- `failAnalysis` routes:
  - `NOT_A_RECEIPT` or `FAILED` → `unreadable` + error kind; no form.
  - Other errors → existing form + retry bar.
- The timeout “Start over” path starts a new attempt and shows `sending → reading → finishing` again.
- The retry spec’s §5.3/§5.4 and §6.3 failed/rejected copy are superseded by this spec; the rest of the retry state machine remains.

## 8. Components and Props

- **`AnalysisProgress`** (new, presentational)
  - Props: `image: PickedReceiptImage`, `stage: AnalysisStage`, `reconnecting: boolean`.
  - Renders thumbnail, title, time pill, stages, progress, hint, Cancel.
  - Owns no network logic.
- **`UnreadableReceiptState`** (new, presentational)
  - Props: `kind: 'rejected' | 'failed'`, `image: PickedReceiptImage`, `onScanAgain`, `onChoosePhoto`, `onEnterManually`, `onClose`.
- **`AddTransactionSheet`**
  - Owns `stage`, stage timer, `unreadableKind`, and the transition to the error card.
  - New prop: `onChoosePhoto?: () => void`.
  - Existing `onRetake` used by Scan again; `onClose` by close.
  - `Enter manually` clears the failed image/path and sets `flow='form'`.
- **`TabBar`**
  - Add a `chooseAnother` helper that closes the sheet, remounts it, and opens the gallery.
  - Pass `onChoosePhoto`.
  - Existing camera retake remains.
- The sheet height for `unreadable` uses the same 0.8 analyzing height; `fill` remains false.

## 9. Visual Details

- Use the existing theme colors, `fonts`, and `radii`; no new palette.
- Stage active dot pulses; done dot shows a check; pending dot is an outline.
- The progress bar uses an indeterminate loop; under reduced motion, show a static bar and no pulse.
- The thumbnail uses the receipt image as `data:${mimeType};base64,...`; if unavailable, show a receipt icon placeholder.
- Keep the existing bottom-sheet animation and gesture dismissal.
- Stage text and error actions must meet existing mobile hit targets.

## 10. Tests

- New component tests:
  - New attempt starts at `sending`; `jobId` switches to `reading`; 6s switches to `finishing`.
  - Completion opens the form and clears stages.
  - `NOT_A_RECEIPT` and `FAILED` show the error card, not the form, with the correct copy.
  - Scan again / Choose another photo / Enter manually call the right callbacks; manual clears the image.
  - Resume starts at `reading`; enqueue retry starts at `sending`.
  - Timers are cleared on close/unmount.
- Update `AnalysisRetryBar` tests/types for the removed kinds.
- Existing retry tests remain green.
- Manual QA: three-stage progression on a slow job; rejected card; failed card; scan again; choose another photo; enter manually; close; reduced motion; one transient error still uses the form retry bar.

## 11. Acceptance Criteria

1. The analyzing sheet shows only the three approved stages.
2. Technical checks and category selection are never shown as separate stages.
3. The stage sequence is Sending → Reading → Finishing up, with hybrid pacing.
4. The receipt thumbnail is visible while processing.
5. Rejected and failed receipts stay in the analyzing sheet with the inline error card.
6. The error card offers Scan again, Choose another photo, Enter manually, and close.
7. No automatic manual-form handoff occurs for rejected/failed receipts.
8. Transient upload/enqueue/poll/timeout errors retain the existing retry bar and form.
9. No backend or dependency changes.
10. Automated tests and `tsc` pass; manual QA covers the new states.

## 12. Risks

- **Pacing can imply progress that is not real.** The stage labels are visual cues, not backend events; no percentage or precise claim is shown.
- **Fast jobs may make Sending flash.** This is accepted to keep the stage tied to the real request.
- **The failed/rejected error card removes the old “Try again” action.** Users can choose the same image again from the gallery; the copy should make replacement the primary recovery path.
- **The 6-second finishing threshold is a heuristic.** It only changes copy; it never claims completion.
