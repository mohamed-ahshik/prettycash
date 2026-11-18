# RevenueCat-Only Paywall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the local fallback paywall and make the RevenueCat hosted paywall the only purchase surface, with a logged "try again later" alert on failure.

**Architecture:** `SubscriptionContext` keeps owning RevenueCat customer info and presentation. The local `ProPaywallModal` and its dedicated context state are deleted. Every presentation failure logs the real error and shows one native alert; restore purchases moves to a Profile row.

**Tech Stack:** Expo SDK 58, React Native 0.88, TypeScript, `react-native-purchases` 11, `react-native-purchases-ui` 11, Jest.

**Spec:** `docs/specs/10-subscriptions/2026-11-18-revenuecat-only-paywall-design.md`

## Global Constraints

- RevenueCat entitlement identifier is `prettycash_pro`.
- Manual expense and income tracking remains free and must not be blocked by any paywall change.
- No new dependencies.
- There is exactly one paywall: the RevenueCat hosted paywall. No local purchase UI may remain.
- Failure alert copy is fixed: title `PrettyCash Pro`, body `Subscriptions are temporarily unavailable. Please try again later.`, buttons `Not now` and `Try again`.
- `PURCHASED` and `RESTORED` refresh entitlement; `NOT_PRESENTED` and `CANCELLED` stay silent.
- Log every presentation failure with a `[RevenueCat]` prefix.
- Implementation status in the spec and this plan must be updated when the work completes.

## Review Focus

- Offline or SDK error while opening the paywall: the user sees one alert, no second paywall, and the real error appears in the console.
- User already holds `prettycash_pro`: nothing is shown — no alert, no upgrade UI.
- User cancels the hosted paywall: nothing is shown.
- Double-tapping the entry point: only one presentation attempt runs.
- Restore with no active subscription: reports `No active subscription found.`, not a false success.
- Missing UI module (web or an old build): the user gets the alert and the app does not crash.

---

### Task 1: Rename the error action from "fallback" to "unavailable"

**Files:**
- Modify: `src/lib/paywallResult.ts:10-23`
- Test: `src/lib/__tests__/paywallResult.test.ts:12-14`

**Interfaces:**
- Consumes: nothing.
- Produces: `type PaywallAction = 'refresh' | 'show-unavailable' | 'none'`; `paywallAction(result: string): PaywallAction` returns `'show-unavailable'` for `'ERROR'`.

- [ ] **Step 1: Update the failing test**

Replace the fallback test in `src/lib/__tests__/paywallResult.test.ts` with:

```ts
it('reports an unavailable state only on a real error', () => {
  expect(paywallAction('ERROR')).toBe('show-unavailable');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/__tests__/paywallResult.test.ts --runInBand`
Expected: FAIL — received `'show-fallback'`, expected `'show-unavailable'`.

- [ ] **Step 3: Rename the action in `src/lib/paywallResult.ts`**

Change the union to `'refresh' | 'show-unavailable' | 'none'`, return `'show-unavailable'` for `'ERROR'`, and update the module comment to say `ERROR` shows the temporarily-unavailable alert because there is no local fallback paywall.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/lib/__tests__/paywallResult.test.ts --runInBand`
Expected: PASS, all six tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/paywallResult.ts src/lib/__tests__/paywallResult.test.ts
git commit -m "refactor: rename paywall error action to unavailable"
```

---

### Task 2: Make SubscriptionContext hosted-paywall-only and delete the local modal

**Files:**
- Modify: `src/context/SubscriptionContext.tsx`
- Delete: `src/components/ProPaywallModal.tsx`
- Modify: `App.tsx:14,263`

**Interfaces:**
- Consumes: `paywallAction` returning `'show-unavailable'` from Task 1.
- Produces: `restorePurchases: () => Promise<boolean>` (true when `prettycash_pro` is active after the restore). Removes `loading`, `unavailableReason`, `paywallVisible`, `closePaywall`, and `purchasePackage` from `SubscriptionContextValue`.

- [ ] **Step 1: Replace the context interface fields**

In `src/context/SubscriptionContext.tsx`, remove these fields from `SubscriptionContextValue`: `loading`, `unavailableReason`, `paywallVisible`, `closePaywall`, `purchasePackage`. Change `restorePurchases` to `() => Promise<boolean>`.

- [ ] **Step 2: Add the alert helper and double-tap ref**

At module scope, add:

```ts
function showPaywallUnavailableAlert(onRetry: () => void) {
  Alert.alert(
    'PrettyCash Pro',
    'Subscriptions are temporarily unavailable. Please try again later.',
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Try again', onPress: onRetry },
    ],
  );
}
```

Import `Alert` from `react-native` and add `useRef` to the React import. Remove the unused `PurchasesPackage` type and the unused `canUseAiScan` import. Add `const presentingPaywall = useRef(false);` inside the provider.

- [ ] **Step 3: Remove the local-modal state and simplify `refresh`**

Delete the `loading`, `unavailableReason`, and `paywallVisible` state hooks and every `setLoading` / `setUnavailableReason` call. In `refresh`:
- When the API key is null, `console.warn('[RevenueCat] API key is not configured for this platform.')` and return.
- In the catch, `console.warn('[RevenueCat] failed to load subscriptions', error)`.

- [ ] **Step 4: Rewrite the presentation failure paths**

`presentRevenueCatPaywall` must:
- Return immediately when `presentingPaywall.current` is true; set it true on entry and false in `finally`.
- Build `const retry = () => { void presentRevenueCatPaywall(); };`
- If `getRevenueCatUI()` returns null: log `[RevenueCat] paywall UI unavailable` and call `showPaywallUnavailableAlert(retry)`.
- On `'refresh'`: `await refresh()`.
- On `'show-unavailable'`: log `[RevenueCat] paywall presentation failed` plus the result, then call `showPaywallUnavailableAlert(retry)`.
- On `'none'` / default: do nothing.
- In the catch: log `[RevenueCat] failed to present paywall` plus the error and call `showPaywallUnavailableAlert(retry)`.

`presentCustomerCenter` must use the same helper with its own retry closure; on missing UI log `[RevenueCat] customer center UI unavailable`, and on throw log `[RevenueCat] failed to present customer center`.

- [ ] **Step 5: Update restore and remove the purchase callback**

Change `restorePurchases` to:

```ts
const restorePurchases = useCallback(async (): Promise<boolean> => {
  const next = await Purchases.restorePurchases();
  setCustomerInfo(next);
  return next.entitlements.active[ENTITLEMENT_ID] != null;
}, []);
```

Delete the `purchasePackage` callback. Update the context value and its dependency array to the reduced surface.

- [ ] **Step 6: Delete the local paywall**

Delete `src/components/ProPaywallModal.tsx`, remove its import from `App.tsx:14`, and remove `<ProPaywallModal />` from `App.tsx:263`.

- [ ] **Step 7: Verify the build and tests**

Run: `npx tsc --noEmit`
Expected: PASS with no references to the removed fields or component.

Run: `npm test -- --runInBand`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/context/SubscriptionContext.tsx App.tsx
git rm src/components/ProPaywallModal.tsx
git commit -m "feat: make RevenueCat the only paywall"
```

---

### Task 3: Add Restore Purchases to Profile

**Files:**
- Modify: `src/screens/ProfileScreen.tsx:2,35-44,187-222`

**Interfaces:**
- Consumes: `restorePurchases(): Promise<boolean>` from Task 2.
- Produces: no new exports.

- [ ] **Step 1: Wire the restore handler**

Add `Alert` to the `react-native` import. Destructure `restorePurchases` from `useSubscription()`. Add `const [restoring, setRestoring] = useState(false);`.

Add:

```ts
const handleRestorePurchases = async () => {
  setRestoring(true);
  try {
    const restored = await restorePurchases();
    Alert.alert(
      'PrettyCash Pro',
      restored ? 'Purchases restored.' : 'No active subscription found.',
    );
  } catch {
    Alert.alert(
      'PrettyCash Pro',
      'Could not restore purchases. Please try again later.',
    );
  } finally {
    setRestoring(false);
  }
};
```

- [ ] **Step 2: Render the row for non-Pro users**

Immediately after the PrettyCash Pro `Pressable` and before the `isPro` Manage subscription block, add a `{!isPro ? ... : null}` `Pressable` using the existing `menuRow`, `menuIconBox`, `menuInfo`, `menuTitle`, and `menuSubtitle` styles. It must:

- Use the MaterialCommunityIcons name `restore`.
- Show `Restore Purchases` as the title.
- Show `Checking your subscriptions…` while `restoring`, otherwise `Already subscribed on another device?`.
- Disable the press while restoring.
- Call `void handleRestorePurchases()` on press.
- Show an `ActivityIndicator` while restoring, otherwise a `chevron-right` icon.

- [ ] **Step 3: Verify the build and tests**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npm test -- --runInBand`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/screens/ProfileScreen.tsx
git commit -m "feat: add restore purchases to profile"
```

---

### Task 4: Update documentation and run final verification

**Files:**
- Modify: `docs/architecture/10-subscriptions.md:76-88`
- Modify: `docs/specs/10-subscriptions/2026-11-18-revenuecat-only-paywall-design.md`
- Modify: `docs/plans/10-subscriptions/2026-11-18-revenuecat-only-paywall.md`
- Modify: `docs/plans/plans-index.md:18`

**Interfaces:**
- Consumes: the behaviour shipped in Tasks 1–3.
- Produces: documentation that matches the code.

- [ ] **Step 1: Update the architecture doc**

In `docs/architecture/10-subscriptions.md`, change the `ERROR` row of the presentation table to:

| `ERROR` | Paywall failed to load or purchase errored | Log the error and show the temporarily-unavailable alert with Try again |

Add below the table:

> There is no local fallback paywall. If the hosted paywall cannot load, the app logs the RevenueCat error and shows a temporarily-unavailable alert. Restore Purchases remains available from Profile for non-Pro users.

Remove the stale `ProPaywallModal` / `ProScreen` code-area entries and mark `src/context/SubscriptionContext.tsx` as implemented.

- [ ] **Step 2: Update the spec and plan status**

In the spec, set `**Status:** Approved` and `**Implementation status:** Implemented; device verification pending.` In this plan, set the header implementation status to `Implemented; device verification pending.` and add the same line to the plan's final section.

- [ ] **Step 3: Index the plan**

Add `[[2026-11-18-revenuecat-only-paywall]]` to the Subscriptions row of `docs/plans/plans-index.md`.

- [ ] **Step 4: Check for dead references**

Run: `grep -rn "ProPaywallModal\|paywallVisible\|closePaywall\|purchasePackage\|show-fallback\|unavailableReason" src App.tsx`
Expected: no output.

- [ ] **Step 5: Run the full checks**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npm test -- --runInBand`
Expected: PASS.

- [ ] **Step 6: Device verification (developer-run)**

On the development build:

- Cold start → Profile → PrettyCash Pro opens the RevenueCat hosted paywall.
- Dismiss it → no local sheet appears.
- Scan-limit "Upgrade to Pro" opens the same hosted paywall.
- Airplane mode → alert appears, no local sheet, console has a `[RevenueCat]` error.
- Double-tap the Profile row → one paywall presentation.
- Pro account → paywall is skipped, Manage subscription opens Customer Center.
- Non-Pro account → Restore Purchases reports `No active subscription found.`.
- Subscribed account → Restore Purchases reports `Purchases restored.`.
- Hosted paywall shows distinct Monthly and Annual prices.

- [ ] **Step 7: Commit**

```bash
git add docs/architecture/10-subscriptions.md docs/specs/10-subscriptions/2026-11-18-revenuecat-only-paywall-design.md docs/plans/10-subscriptions/2026-11-18-revenuecat-only-paywall.md docs/plans/plans-index.md
git commit -m "docs: document RevenueCat-only paywall"
```

---

## Implementation status

Not started.
