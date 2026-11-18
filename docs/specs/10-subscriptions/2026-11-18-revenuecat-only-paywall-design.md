# RevenueCat-Only Paywall Design

**Date:** 2026-11-18
**Status:** Approved
**Implementation status:** Not started.

---

## Related Documents

- Architecture: [[docs/architecture/10-subscriptions|10 — Subscriptions Architecture]]
- Prior spec: [[docs/specs/10-subscriptions/2026-11-10-revenuecat-subscriptions-and-trial-design|RevenueCat Subscriptions & 7-Day AI Trial Design]]
- Specs index: [[docs/specs/specs-index|Specs Index]]

---

## 1. Intent

Make RevenueCat's hosted paywall the **only** subscription purchase surface in the app.

Today `openPaywall` tries `presentPaywallIfNeeded`, and on any failure it silently opens the local `ProPaywallModal` (`src/context/SubscriptionContext.tsx:212-242`). That fallback duplicates the purchase UI, can drift from RevenueCat, and hides configuration or network errors — the 2026-11-18 device report showed the local modal even though the hosted paywall opens from Profile.

The replacement behaviour is simple: if the hosted paywall cannot be shown, tell the user subscriptions are temporarily unavailable and ask them to try again later. Do not show a second paywall.

## 2. Goals

- One paywall: the RevenueCat hosted paywall.
- Delete the local `ProPaywallModal` and the context state that exists only for it.
- Log every presentation failure and show a clear "try again later" alert.
- Keep a restore-purchases path available outside the paywall.
- Keep `PURCHASED` / `RESTORED` refreshing entitlement and `NOT_PRESENTED` / `CANCELLED` silent.

## 3. Non-goals

- Fixing the duplicate Monthly/Annual $4.99 price mapping (RevenueCat / Play configuration).
- Changing trial, quota, or entitlement logic (`prettycash_pro` stays as-is).
- Customising the hosted paywall design or adding new RevenueCat features.
- Removing the Customer Center for Pro users.

## 4. Anti-goals

- Any purchase path that bypasses RevenueCat.
- Showing upgrade UI to a user who already holds `prettycash_pro`.
- Blocking manual expense tracking — it remains free and unaffected.

## 5. Constraints

- The hosted paywall was reported opening from Profile on device on 2026-11-18.
- `presentPaywallIfNeeded` resolves one of `PURCHASED`, `RESTORED`, `ERROR`, `NOT_PRESENTED`, `CANCELLED`, and may also throw.
- `react-native-purchases-ui` is required. Web and unsupported environments will hit the failure path; that is acceptable for a native subscription product.
- No new dependencies.
- `src/lib/paywallResult.ts` currently names the error action `show-fallback`; that name must change with the fallback.

## 6. Approaches

### A. Keep the modal, replace its contents with an unavailable state

Retains the component and context surface, removes only the plans and purchase button. Least deletion, but leaves a second paywall-shaped UI and dead state behind. Rejected: it preserves the confusion this change is meant to remove.

### B. Delete the modal and show a native alert with Retry (chosen)

Every failure path logs the real error and shows one alert: "Subscriptions are temporarily unavailable. Please try again later." with **Try again** and **Not now**. One purchase path, no duplicated UI, minimal code. Restore access moves to Profile.

### C. Delete the modal and build a dedicated unavailable sheet

Better visual fit than an alert, but adds a component, styles, and tests for an error state. Rejected for scope.

## 7. Design

### 7.1 Paywall presentation

`presentRevenueCatPaywall` keeps calling `presentPaywallIfNeeded` with `requiredEntitlementIdentifier: 'prettycash_pro'` and `offering: offerings?.current`.

- Add a `presentingPaywall` ref to ignore repeated taps while presentation is in flight.
- `getRevenueCatUI()` returns null → log `[RevenueCat] paywall UI unavailable` and show the unavailable alert.
- `PURCHASED` / `RESTORED` → `refresh()`.
- `ERROR` → log the result and show the unavailable alert.
- `NOT_PRESENTED` / `CANCELLED` → do nothing.
- Thrown error → log the error and show the unavailable alert.

Alert copy:

| Part | Text |
|---|---|
| Title | `PrettyCash Pro` |
| Body | `Subscriptions are temporarily unavailable. Please try again later.` |
| Buttons | `Not now` (cancel), `Try again` (calls `openPaywall` again) |

### 7.2 Customer Center

`openCustomerCenter` keeps presenting RevenueCat's Customer Center. If the UI module is missing or presentation throws, log the error and show the same unavailable alert instead of opening the local paywall.

### 7.3 Restore purchases

Restore must not disappear with the local modal.

- Keep `restorePurchases` in the subscription context.
- Change it to return whether `prettycash_pro` is active after restoring (or after the customer info refresh), so the caller can distinguish "restored" from "nothing to restore".
- Add a **Restore Purchases** row to the Subscription section of `ProfileScreen`, visible when `!isPro`.
- Disable the row while restoring.
- Success with entitlement → `Purchases restored.`
- Success without entitlement → `No active subscription found.`
- Failure → `Could not restore purchases. Please try again later.`

### 7.4 Removals

- Delete `src/components/ProPaywallModal.tsx`.
- Remove `<ProPaywallModal />` from `App.tsx`.
- Remove from `SubscriptionContext`: `paywallVisible`, `closePaywall`, `purchasePackage`, `loading`, `unavailableReason`.
- Keep `restorePurchases` and `openCustomerCenter`.
- Remove the now-unused `PurchasesPackage` import.
- Rename `PaywallAction` value `show-fallback` → `show-unavailable` in `src/lib/paywallResult.ts`; update `src/lib/__tests__/paywallResult.test.ts` and comments.

### 7.5 Documentation updates

- `docs/architecture/10-subscriptions.md`: update the paywall presentation result table (`ERROR` now shows the unavailable alert, not a local paywall) and remove the planned local paywall references.

## 8. Verification

- Cold start → Profile → PrettyCash Pro opens the RevenueCat hosted paywall.
- Dismiss it → no local sheet appears.
- Scan-limit "Upgrade to Pro" opens the same hosted paywall.
- Force a failure (airplane mode or a temporary throw) → alert appears, no local modal, and `[RevenueCat]` log contains the real error.
- Pro user → paywall is not presented (`NOT_PRESENTED`), Customer Center still opens.
- Restore row: subscribed account restores; unsubscribed account reports no active subscription; failure shows the retry message.
- `npm test` passes (updated `paywallResult` expectations).
- `npx tsc --noEmit` passes.
- Hosted paywall shows distinct Monthly and Annual prices before release; the current $4.99/$4.99 mapping is a separate RevenueCat/Play configuration issue.

## 9. Follow-ups

- Fix the Monthly/Annual price mapping in RevenueCat / Play Console.
- Watch the new `[RevenueCat]` logs to identify the transient failure that produced the 2026-11-18 fallback screenshot.

## 10. Implementation status

Not started.
