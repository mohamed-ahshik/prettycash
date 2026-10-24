---
title: "Split Add Button with Hold for Gallery"
type: spec
status: approved
date: 2026-10-24
section: receipts
tags:
  - prettycash
  - spec
  - add-transaction
  - receipt
  - tab-bar
---

# PrettyCash — Split Add Button with Hold for Gallery

**Date:** 2026-10-24
**Status:** Approved for implementation
**Implementation status:** Implemented — `npm test` and `npx tsc --noEmit` pass; on-device gesture, permission, and haptics QA outstanding.

---

## 1. Overview & Objective

Replace the single `+` action in the tab bar with a split add control:

- **Pencil (left):** open manual entry immediately.
- **Camera (right):** tap opens the system camera immediately.
- **Hold camera for 2 seconds:** open the photo gallery instead.

Both actions are always available. There is no remembered mode, no default, and no persistent selection. A short press highlight and a hold progress ring tell the user what is being selected.

The goal is fewer taps and no chooser screen: one tap to the camera or the manual form.

---

## 2. Locked Decisions

| Decision | Value |
|---|---|
| Scope | Split control + its pill styling. Keep the current Home, balance card, and rest of the app look. |
| Layout | Pencil left, camera right; camera is the more-used action. |
| Default/mode | None. Both actions are always one tap; nothing is remembered. |
| Camera tap | Opens the system camera immediately. |
| Camera hold | 2 seconds → opens the photo gallery. |
| Early release | Release before 2 seconds = tap → camera opens. |
| Hold feedback | Circular progress ring fills over 2 seconds; haptic at completion. |
| Selection feedback | Pressed button gets a translucent white circular highlight; it clears when released. No persistent selection. |
| Discovery | One-time coach mark: “Tap camera to scan · Hold 2s for gallery.” |
| Picker launch | Directly from the tab bar; the add sheet opens only after an image is selected (or immediately for manual). |
| Camera failure | In-app message with a visible “Choose from gallery” action. |
| Manual entry | Opens the form directly; Name field focused and keyboard shown. |
| Old flow | Remove the + chooser and the separate capture screen. |
| Gallery | System image library; no custom in-app camera. |
| Backend / DB | No changes. Existing upload, analysis, auto-categorization, and job polling stay unchanged. |

---

## 3. Scope

**In scope**

- `SplitAddButton` component in the tab bar.
- Direct camera/gallery picker launch from the tab bar.
- 2-second hold with progress ring, haptic, early-release behavior.
- First-use coach mark.
- Camera permission/unavailable error with a gallery action.
- Refactor `AddTransactionSheet` to start from a picked image or manual entry.
- Remove the chooser/capture flow and `ReceiptImagePicker`.
- Manual form autofocus.
- Tests and manual QA.

**Out of scope**

- Dark-green balance card or broader Home visual refresh.
- Custom in-app camera UI (`expo-camera`).
- Changes to receipt analysis, auto-categorization, or the vision backend.
- Changes to manual form fields, categories, or transaction saving.
- Analytics.
- Changing the haptics setting behavior.
- A configurable default add method.

---

## 4. UX Specification

### 4.1 Layout

```
TAB BAR
[ Home ] [ Insights ]   [ pencil | camera ]   [ Categories ] [ Profile ]
                            ↑ left   ↑ right
```

- The split control replaces the current `+` button in `TabBar`.
- Pill background: `colors.primary`; icons: `colors.primaryForeground`; selected/pressed background: `rgba(255,255,255,0.16)`.
- Each half is at least **44×44** points, with a 1 px translucent divider.
- Camera is on the right.
- The split control is available on every tab.
- The tab bar must be checked at 320, 360, and 390 pt widths; reduce gaps or horizontal padding before shrinking either action below 44 pt.

### 4.2 Camera tap

```
Tap camera
  → request camera permission if needed
  → open system camera
  → user captures or cancels
  → cancel: stay on the current screen; no sheet
  → capture: open AddTransactionSheet with the image; start upload + analysis
```

- Camera options match the current picker: `{ base64: true, quality: 0.8 }`.
- No capture/chooser screen appears before the system camera.
- The pressed camera circle highlights for the press duration, then clears.

### 4.3 Hold for gallery

```
Press camera
  → highlight appears; progress ring starts
  → release < 2s: ring clears, camera opens (early release = tap)
  → hold 2s: ring completes, haptic fires, photo gallery opens
  → cancel gallery: stay on the current screen; no sheet
  → choose image: open AddTransactionSheet with the image; start upload + analysis
```

- `GALLERY_HOLD_MS = 2000`.
- `delayLongPress={GALLERY_HOLD_MS}` on the camera `Pressable`.
- `onPressIn` starts the ring; `onLongPress` opens the gallery and resets the ring; `onPressOut` stops/resets the ring; `onPress` opens the camera only when a long press did **not** fire.
- Gallery options match the current picker: `{ mediaTypes: ['images'], base64: true, quality: 0.8 }`.
- A long press must not also open the camera. Guard with a ref (`longPressFired`).

### 4.4 Manual entry

```
Tap pencil
  → open AddTransactionSheet in form mode
  → Name field focused; keyboard open
  → blank draft; no category payload; no auto-categorization
```

- Manual entry keeps the current form defaults (date, time, first category).
- The existing manual behavior after the form opens is unchanged.

### 4.5 Feedback and discovery

- **Pressed state:** the selected half gets a circular translucent white background and a slight scale-down while pressed. It clears on release. Nothing persists.
- **Hold ring:** camera only. A progress ring around the camera circle fills over 2 seconds. It is visual feedback and is hidden from accessibility.
- **Haptic:** one selection haptic at the start of the hold and a success haptic when the gallery opens, using the existing haptics helpers (respect the profile setting).
- **First-use coach mark:**
  - Copy: `Tap camera to scan · Hold 2s for gallery`
  - Positioned above the split control, with a small pointer toward the camera.
  - Shown once per install; auto-dismiss after 6 seconds or when the user taps either add action.
  - Stored with `AsyncStorage` key `@prettycash/splitAddHintSeen`.
  - Accessible text; the camera button also gets `accessibilityHint`.

### 4.6 Camera and gallery errors

- **Camera permission denied or camera unavailable:** show an in-app bottom sheet:
  - Title: `Camera unavailable`
  - Body: `Camera access is off, or the camera could not open. You can choose a receipt from your gallery instead.`
  - Primary: `Choose from gallery`
  - Secondary: `Cancel`
- **Gallery failure:** show the same sheet with:
  - Title: `Gallery unavailable`
  - Body: `We couldn't open your photo library. Please try again.`
  - Primary: `Try again`
  - Secondary: `Cancel`
- A camera failure must not block manual entry.
- Gallery cancellation is a no-op.

### 4.7 Accessibility

- Two separate accessible buttons:
  - `Scan receipt` — hint: `Tap to scan. Hold for 2 seconds to choose from gallery.`
  - `Enter manually`
- The camera button exposes a custom accessibility action: `Choose from gallery`, wired to the gallery path (for users who cannot perform a long press).
- The hold ring and decorative separator are hidden from assistive technology.
- The coach mark is readable and dismissible.
- All touch targets are at least 44×44 pt.

---

## 5. Architecture

### 5.1 Files

**Create**

- `src/components/SplitAddButton.tsx` — layout, pressed state, hold ring, haptics, coach mark trigger.
- `src/services/receiptPicker.ts` — `getImageBase64` and picker option helpers.
- `src/hooks/useReceiptPicker.ts` — camera/gallery permissions, launch, result, errors.
- `src/components/PickerErrorSheet.tsx` — camera/gallery error sheet.

**Modify**

- `src/components/TabBar.tsx` — replace `+` with `SplitAddButton`; own picker/sheet state; show `PickerErrorSheet`.
- `src/components/AddTransactionSheet.tsx` — accept `initialImage` / `startManual`; remove chooser/capture; start analyzing or form.
- `src/components/TransactionForm.tsx` — `autoFocusName` prop.
- `src/components/ReceiptImagePicker.tsx` — remove; move `getImageBase64` into `src/services/receiptPicker.ts`.
- `src/services/__tests__` — add tests for the picker helper.

The hold ring uses the already-installed `react-native-svg` with a classic `Animated` value (not Reanimated) to avoid the web freeze seen with the scan-line animation.

### 5.2 Interfaces

```ts
export interface PickedReceiptImage {
  base64: string;
  mimeType: string;
}

export function getImageBase64(
  asset: ImagePicker.ImagePickerAsset,
): Promise<PickedReceiptImage | null>;

export interface ReceiptPicker {
  pickFromCamera: () => Promise<PickedReceiptImage | null>;
  pickFromGallery: () => Promise<PickedReceiptImage | null>;
  error: 'camera_permission' | 'camera_failed' | 'gallery_failed' | null;
  clearError: () => void;
}

interface SplitAddButtonProps {
  onScan: () => void;
  onGallery: () => void;
  onManual: () => void;
}

interface AddTransactionSheetProps {
  visible: boolean;
  initialImage?: PickedReceiptImage | null;
  startManual?: boolean;
  onClose: () => void;
}
```

### 5.3 TabBar flow

```ts
const split = useReceiptPicker();
const [sheetVisible, setSheetVisible] = useState(false);
const [initialImage, setInitialImage] = useState<PickedReceiptImage | null>(null);
const [startManual, setStartManual] = useState(false);

async function scan() {
  const image = await split.pickFromCamera();
  if (!image) return;
  setInitialImage(image);
  setStartManual(false);
  setSheetVisible(true);
}

async function gallery() {
  const image = await split.pickFromGallery();
  if (!image) return;
  setInitialImage(image);
  setStartManual(false);
  setSheetVisible(true);
}

function manual() {
  setInitialImage(null);
  setStartManual(true);
  setSheetVisible(true);
}
```

The tab bar renders:

```tsx
<SplitAddButton
  onScan={scan}
  onGallery={gallery}
  onManual={manual}
/>
<AddTransactionSheet
  visible={sheetVisible}
  initialImage={initialImage}
  startManual={startManual}
  onClose={() => {
    setSheetVisible(false);
    setInitialImage(null);
    setStartManual(false);
  }}
/>
<PickerErrorSheet
  error={split.error}
  onGallery={gallery}
  onClose={split.clearError}
/>
```

### 5.4 AddTransactionSheet

- `Flow` becomes `'analyzing' | 'form'`.
- Remove the chooser and capture screens, `ReceiptImagePicker`, and the `handleManual` chooser path.
- On open:
  - `initialImage` → start the existing upload/analyze flow with that image.
  - `startManual` → reset drafts and set `flow = 'form'` with `autoFocusName`.
- Keep the existing `requestToken` guard, profile/category loading, upload, analysis, form, errors, and save behavior.
- On close, reset all sheet state and discard in-flight results.
- Do not run auto-categorization for manual entry.

### 5.5 TransactionForm

Add `autoFocusName?: boolean`; when true, the Name input receives focus after the form mounts and the keyboard opens. Used only for manual entry.

### 5.6 Existing behavior preserved

- Receipt upload to Supabase storage.
- Vision enqueue/poll, 60s enqueue timeout, 15s poll timeout.
- `rejected` / `failed` / timeout handling.
- Category payload and form preselection.
- Transaction saving and month selection.

---

## 6. Edge Cases

- Camera permission denied: error sheet with gallery action; the 2s hold still opens the gallery.
- Camera permission revoked while the app is open: treat as camera failure.
- Camera cancel: no sheet, current screen unchanged.
- Gallery cancel: no sheet, current screen unchanged.
- Gallery failure: error sheet with `Try again`.
- Image cannot be read: error message; no sheet opens.
- Early release before 2s: camera opens.
- Long press: camera must not open after the gallery opens.
- Picker returns while the sheet is already opening: the request token/once guard prevents duplicate uploads.
- Sheet closed during analysis: discard results (existing behavior).
- Haptics disabled: no haptics; the ring still works.
- Web: camera may be a file input; the hold works with pointer; `getImageBase64` handles `asset.file`.
- Small screens: verified at 320/360; the split control must not crush tab labels.
- Screen reader: gallery available as an accessibility action.
- First-use coach mark already seen: no repeat.

---

## 7. Testing

### 7.1 Automated

- `getImageBase64` tests:
  - base64 asset returns base64 and mime type;
  - missing mime type falls back to `image/jpeg`;
  - web file asset path (mock `FileReader`) or manual verification if the jest environment lacks it.
- Existing `npm test` suite and `npx tsc --noEmit`.
- No component-test framework is installed; do not add one just for this feature.

### 7.2 Manual QA matrix

| Case | Expected |
|---|---|
| Tap camera | System camera opens; capture opens the analyzing sheet |
| Cancel camera | No sheet; current screen remains |
| Hold camera 1.5s, release | Camera opens (early release = tap) |
| Hold camera 2s | Progress ring fills; haptic; gallery opens |
| Cancel gallery | No sheet |
| Pick gallery image | Analyzing sheet with the image |
| Tap pencil | Form opens; Name focused; keyboard visible |
| Press/hold feedback | Circle highlight on press; clears on release; no persistent state |
| Camera permission denied | Error sheet with Choose from gallery |
| Gallery failure | Error sheet with Try again |
| First launch | Coach mark appears once; dismisses after 6s or on action |
| Second launch | No coach mark |
| Haptics off | No haptics; ring still works |
| Screen reader | Two buttons; camera gallery custom action works |
| 320/360pt width | Split control and tab labels fit; 44pt targets |
| Android / iOS / web | Picker, gallery, error sheet, and hold behave |

---

## 8. Acceptance Criteria

1. The `+` is replaced by a pencil/camera split control; camera is on the right.
2. Tap camera opens the system camera in one tap, without a sheet or capture screen first.
3. Holding camera for 2s opens the gallery; the ring fills; a haptic fires.
4. Releasing before 2s opens the camera.
5. A long press never also opens the camera.
6. Tapping pencil opens the manual form with Name focused and keyboard open.
7. There is no default, remembered mode, or persistent selection.
8. Pressing an action highlights that circle; releasing clears it.
9. A first-use coach mark explains tap vs hold and does not repeat.
10. Camera permission/failure shows an in-app message with a gallery action.
11. Cancel from camera or gallery leaves the current screen unchanged.
12. The old chooser and capture screens are removed.
13. Existing receipt upload, analysis, auto-categorization, errors, and saving are unchanged.
14. Screen-reader users can open the gallery via an accessibility action.
15. `npm test` and `npx tsc --noEmit` pass.
16. The split control fits at 320pt with 44pt touch targets.

---

## 9. Risks

- **2-second hold is long.** The ring and coach mark mitigate it; the constant should be easy to tune later.
- **Hidden gesture.** The first-use hint and accessibility action are mandatory; do not ship without them.
- **Pressable long-press semantics.** The guard ref must be tested manually to ensure the camera never opens after a completed hold.
- **Picker refactor.** Moving from the sheet's capture flow to a direct picker touches the receipt flow; preserve the existing upload/analyze/error behavior.
- **Web camera.** `launchCameraAsync` may behave as a file input; verify on web.
- **Tab bar width.** The split control is wider than the old `+`; verify small screens.
- **Coach mark storage.** It is device-local; a reinstall shows it again, which is acceptable.

---

## 10. Rollout

1. Implement and test on Android/iOS/web.
2. Ship the frontend only; no backend or migration.
3. Verify the existing scan + auto-categorization flow end to end.
4. Watch for users missing the gallery; if usage is low, consider a visible gallery action later.

---

## 11. Out of Scope

- Home/balance-card visual refresh.
- Custom camera UI.
- Configurable default add method.
- Backend or Supabase changes.
- Analytics.
- Changes to the manual form fields or category defaults beyond Name autofocus.
