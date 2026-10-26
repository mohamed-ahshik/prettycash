# Analyzing Stages and Failure Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the scan box with a three-stage analyzing view and keep every analysis failure in that sheet with a clear recovery card.

**Architecture:** Add small presentational `AnalysisProgress` and `AnalysisErrorCard` components. `AddTransactionSheet` owns the stage timeline, error kind, and action routing. `TabBar` supplies the gallery replacement action. The form opens only on success or explicit manual entry.

**Tech Stack:** Expo SDK 57, React Native 0.86, TypeScript, Jest, react-test-renderer, React Native Animated.

**Implementation status:** Implemented — components, timeline, failure routing, TabBar wiring, 27 suites / 152 tests, and `tsc` pass. Manual QA pending.

## Global Constraints

- No backend, queue, database, or provider changes.
- Exactly three visible stages: `Sending receipt`, `Reading receipt`, `Finishing up`.
- Stage thresholds: 6s → finishing; 15s → slow-wait copy/pill.
- No percentages, fake countdowns, or technical sub-stages.
- No new dependencies.
- Keep existing save-error handling in `TransactionForm`.
- Respect reduced motion: no looping progress/pulse animation.
- `npx tsc --noEmit` and `npm test -- --runInBand` must pass.

---

### Task 1: AnalysisErrorCard

**Files:**
- Create: `src/components/AnalysisErrorCard.tsx`
- Test: `src/components/__tests__/AnalysisErrorCard.test.tsx`

**Interfaces:**
- Produces:
  - `AnalysisErrorKind = 'upload' | 'enqueue' | 'poll' | 'timeout' | 'rejected' | 'failed'`
  - `AnalysisErrorAction = 'retry-upload' | 'retry-analysis' | 'retry-checking' | 'keep-checking' | 'start-over' | 'try-again' | 'scan-again' | 'choose-photo' | 'enter-manually'`
  - `AnalysisErrorCard({ kind, image, onAction, onClose })`
- The card renders the receipt thumbnail, friendly copy, variant actions, Enter manually, and close.
- Variant copy and actions follow the spec table.

**Steps:**
- [x] Write tests that render rejected, failed, timeout, and upload cards; assert titles, primary action, and `onAction` payloads.
- [x] Run the test and confirm the missing component fails.
- [x] Implement the presentational card with themed styles and an `Image` data URI.
- [x] Run the card tests until green.

### Task 2: AnalysisProgress

**Files:**
- Create: `src/components/AnalysisProgress.tsx`
- Test: `src/components/__tests__/AnalysisProgress.test.tsx`

**Interfaces:**
- Produces:
  - `AnalysisStage = 'sending' | 'reading' | 'finishing'`
  - `AnalysisProgress({ image, stage, slowWait, reconnecting, onCancel })`
- Renders eyebrow, title, time pill, receipt thumbnail, stage list, indeterminate bar, hint, reconnect note, and Cancel.
- Under reduced motion, the bar and active dot are static.

**Steps:**
- [x] Write tests for each stage, slow-wait copy, reconnect note, and Cancel callback.
- [x] Run the test and confirm the missing component fails.
- [x] Implement the component and animations with `Animated` and `useReducedMotion`.
- [x] Run the progress tests until green.

### Task 3: AddTransactionSheet Timeline and Error Routing

**Files:**
- Modify: `src/components/AddTransactionSheet.tsx`
- Delete: `src/components/AnalysisRetryBar.tsx`
- Test: `src/components/__tests__/AddTransactionSheet.test.tsx`

**Interfaces:**
- Consumes: `AnalysisStage`, `AnalysisErrorKind`, `AnalysisErrorAction`, `AnalysisProgress`, `AnalysisErrorCard`.
- Produces:
  - `Flow = 'analyzing' | 'error' | 'form'`
  - New prop `onChoosePhoto?: () => void`
  - Attempt fields `jobStartedAt?: number`
- Owns stage timers, `slowWait`, `analysisError`, and retry/start-over/try-again action handlers.

**Steps:**
- [x] Write a test that mocks upload/analyze and asserts: sending → onJobId → reading → 6s → finishing → 15s slow-wait.
- [x] Write tests for rejected and failed routing to the error card with no form.
- [x] Write tests for retry/start-over/try-again/enter-manually/scan-again/choose-photo actions.
- [x] Run the tests and confirm they fail against the old sheet.
- [x] Refactor `AddTransactionSheet` to the new flow and timeline; remove `AnalysisRetryBar` usage and import.
- [x] Run the focused tests until green; run the suite and `tsc`.

### Task 4: TabBar and Final Integration

**Files:**
- Modify: `src/components/TabBar.tsx`
- Modify: `docs/superpowers/specs/2026-10-25-analyzing-stages-design.md`
- Modify: `docs/superpowers/plans/2026-10-25-analyzing-stages.md`

**Steps:**
- [x] Add `chooseAnother` to `TabBar` and pass `onChoosePhoto`.
- [x] Delete `src/components/AnalysisRetryBar.tsx` if still present.
- [x] Update spec/plan implementation status.
- [x] Run `npx tsc --noEmit`.
- [x] Run `npm test -- --runInBand`.
- [ ] Manual verification on the web: reject image, fail state, retry, resume, slow-wait, choose photo, manual, close.

## Verification

```bash
cd /Users/user/Documents/PrettyCash
npx tsc --noEmit
npm test -- --runInBand
```
