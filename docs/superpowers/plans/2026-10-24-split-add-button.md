# Split Add Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the tab bar `+` with a pencil/camera split control: tap camera for the system camera, hold 2s for the gallery, tap pencil for a manual form with the Name field focused.

**Architecture:** Direct camera/gallery pickers launch from the tab bar; the add sheet opens only after an image is chosen or for manual entry. A new `SplitAddButton` owns the press highlight and hold ring. The existing receipt upload/analysis/auto-categorization flow is preserved.

**Tech Stack:** Expo SDK 57, React Native 0.86, TypeScript, `expo-image-picker`, `react-native-svg`, classic `Animated`, AsyncStorage, Jest 29.

**Spec:** `docs/superpowers/specs/2026-10-24-split-add-button-design.md`

**Implementation status:** Implemented — automated checks pass; on-device gesture, permission, and haptics QA outstanding.

## Global Constraints

- No new dependencies; `react-native-svg` and AsyncStorage are already installed.
- `npm test` and `npx tsc --noEmit` must pass.
- No comments in code.
- Do not change the vision backend, receipt analysis, or auto-categorization behavior.
- Do not commit unless the user asks.

---

### Task 1: Picker service and hook

**Files:**
- Create: `src/services/receiptPicker.ts`
- Create: `src/hooks/useReceiptPicker.ts`
- Create: `src/services/__tests__/receiptPicker.test.ts`
- Remove: `src/components/ReceiptImagePicker.tsx` (move `getImageBase64` first)

**Interfaces:**
- `getImageBase64(asset): Promise<{ base64: string; mimeType: string } | null>`
- `useReceiptPicker(): { pickFromCamera, pickFromGallery, error, clearError }`

- [ ] Move `getImageBase64` from `ReceiptImagePicker.tsx` into `src/services/receiptPicker.ts`, using `import type { ImagePickerAsset } from 'expo-image-picker'`.
- [ ] Add tests for base64 assets, mime fallback, and the web `asset.file` path with a mocked `FileReader`.
- [ ] Implement `useReceiptPicker` with `launchCameraAsync({ base64: true, quality: 0.8 })` and `launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.8 })`.
- [ ] Camera permission denial sets `error='camera_permission'`; camera exceptions set `camera_failed`; gallery exceptions set `gallery_failed`; each picker clears the previous error first.
- [ ] Run `npx tsc --noEmit` and `npm test -- --runInBand`.

---

### Task 2: SplitAddButton

**Files:**
- Create: `src/components/SplitAddButton.tsx`

**Interfaces:**
- Props: `{ onScan: () => void; onGallery: () => void; onManual: () => void }`

- [ ] Render a pill: pencil left, divider, camera right. Each half is 44×44.
- [ ] Pencil `onPress` calls `onManual`; pressed state shows `rgba(255,255,255,0.16)` and scales to 0.94.
- [ ] Camera `onPressIn` starts the 2s ring; `onLongPress` sets a `longPressFired` ref, resets the ring, fires `hapticSuccess()`, and calls `onGallery`; `onPressOut` resets the ring; `onPress` calls `onScan` unless `longPressFired`.
- [ ] Use `delayLongPress={2000}`, a white progress ring built with `react-native-svg` and `Animated.createAnimatedComponent(Circle)`, and `useNativeDriver: false`.
- [ ] Add the camera `accessibilityHint="Tap to scan. Hold for 2 seconds to choose from gallery."` and accessibility action `gallery`.
- [ ] Show the first-use coach mark once using AsyncStorage key `@prettycash/splitAddHintSeen`: copy `Tap camera to scan · Hold 2s for gallery`, auto-hide after 6s, dismiss on either action.
- [ ] Run `npx tsc --noEmit`.

---

### Task 3: PickerErrorSheet

**Files:**
- Create: `src/components/PickerErrorSheet.tsx`

**Interfaces:**
- Props: `{ error: 'camera_permission' | 'camera_failed' | 'gallery_failed' | null; onGallery: () => void; onClose: () => void }`

- [ ] Use `BottomSheet`; camera errors show `Camera unavailable` with `Choose from gallery`; gallery errors show `Gallery unavailable` with `Try again`.
- [ ] Secondary action is `Cancel`; closing clears the error.
- [ ] Match the app's themed card/button styles and accessible labels.
- [ ] Run `npx tsc --noEmit`.

---

### Task 4: TabBar wiring

**Files:**
- Modify: `src/components/TabBar.tsx`

- [ ] Replace the `+` with `SplitAddButton`.
- [ ] Add `useReceiptPicker`, `sheetVisible`, `initialImage`, and `startManual` state.
- [ ] `scan()` and `gallery()` open the sheet only when an image is returned; errors leave the sheet closed and show `PickerErrorSheet`.
- [ ] `manual()` opens the sheet with `startManual`.
- [ ] Clear the picker error when an action succeeds; pass the new props to `AddTransactionSheet`.
- [ ] Remove the old `addWrap`/`addButton` styles.
- [ ] Run `npx tsc --noEmit`.

---

### Task 5: AddTransactionSheet refactor

**Files:**
- Modify: `src/components/AddTransactionSheet.tsx`

- [ ] Add props `initialImage?: PickedReceiptImage | null`, `startManual?: boolean`.
- [ ] Change `Flow` to `'analyzing' | 'form'`; remove `chooser`, `capture`, `ReceiptImagePicker`, and their JSX/styles.
- [ ] On visible + `initialImage`, call the existing upload/analyze flow once; guard with a ref or request token.
- [ ] On visible + `startManual`, reset state and open the form.
- [ ] Pass `autoFocusName={startManual}` and the existing `initialCategoryId`/`initial` props to `TransactionForm`.
- [ ] Preserve the request-token close guard, upload, profile/category loading, analysis, rejected/network/timeout handling, and save.
- [ ] Run `npx tsc --noEmit` and `npm test -- --runInBand`.

---

### Task 6: TransactionForm autofocus

**Files:**
- Modify: `src/components/TransactionForm.tsx`

- [ ] Add `autoFocusName?: boolean`.
- [ ] Focus the Name input after mount with a short delay (350ms) and open the keyboard.
- [ ] Do not focus for scan or edit flows.
- [ ] Run `npx tsc --noEmit`.

---

### Task 7: Cleanup, docs, verification

- [ ] Remove `src/components/ReceiptImagePicker.tsx` after moving the helper.
- [ ] Update the spec `Implementation status` to `Implemented`.
- [ ] Run `npm test -- --runInBand` and `npx tsc --noEmit`.
- [ ] Manual matrix: tap camera, cancel, early release, 2s hold, gallery cancel, camera permission denied, gallery failure, pencil autofocus, coach mark once, haptics off, screen reader, 320/360 widths, Android/iOS/web.

**Implementation status:** Implemented (automated checks pass; manual device QA outstanding).
