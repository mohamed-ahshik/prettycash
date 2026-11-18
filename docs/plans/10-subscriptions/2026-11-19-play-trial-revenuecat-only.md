# Play Trial + RevenueCat-Only Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the app-managed trial with the Play `free-trial-7d` RevenueCat entitlement, remove daily scan caps and Customer Center, and add a Google Play `managementURL` link.

**Architecture:** RevenueCat `CustomerInfo` becomes the source of truth for Pro/trial state. A pure `entitlementState` helper feeds `SubscriptionContext`; the provider mounts above the auth gate so the SDK configures at startup and logs in/out with Supabase. UI reads `isPro` / `isTrial` / `expirationDate` / `managementURL`; the backend remains the scan-quota enforcement point.

**Tech Stack:** Expo SDK 58, React Native 0.88, TypeScript, `react-native-purchases` 11, `react-native-purchases-ui` 11, Jest.

**Spec:** `docs/specs/10-subscriptions/2026-11-19-play-trial-revenuecat-only-design.md`

**Branch:** `mohamedahshik/addPayment`

## Global Constraints

- Entitlement ID is `prettycash_pro`.
- Trial is full Pro: unlimited AI scans; free users get 0.
- RevenueCat `CustomerInfo` wins whenever loaded; backend `isPro` is only a startup fallback while `customerInfo` is null.
- `isTrial` only when the entitlement `periodType === 'TRIAL'`.
- No local timers, local storage, or account-age trial math.
- No Customer Center. Management is a `CustomerInfo.managementURL` link with the generic Play Store fallback.
- Hosted RevenueCat paywall is the only purchase UI; never render a second paywall.
- Never use the RevenueCat secret key in the app.
- Public key stays in env through `src/lib/revenuecatKey.ts`.
- Keep all `Purchases.*` calls in `SubscriptionContext.tsx`.
- The spec and plan implementation status must be updated when done.

## Review Focus

- Free user: `canScan === false`, tapping scan opens the hosted paywall.
- Play trial: `isPro === true`, `isTrial === true`, unlimited scans; Profile says `Trial active, ends <date>`.
- RevenueCat `CustomerInfo` overrides a stale backend `isPro` once loaded.
- SDK is configured at startup, logged in with the Supabase user, and logged out on sign-out.
- `managementURL` null still produces a working Play Store management link.
- Hosted paywall cancel is silent; purchase/restore refreshes entitlement.
- `SUBSCRIPTION_REQUIRED` while Pro shows the activating message; free shows upgrade copy.
- No Customer Center code remains.

---

### Task 1: Entitlement helper and trial-date formatting

**Files:**
- Create: `src/lib/entitlement.ts`
- Test: `src/lib/__tests__/entitlement.test.ts`

**Interfaces:**
- Consumes: `CustomerInfo`, `PurchasesEntitlementInfo` types from `react-native-purchases`.
- Produces:
  - `interface EntitlementState { isPro; isTrial; expirationDate; willRenew; managementURL }`
  - `entitlementState(customerInfo: CustomerInfo | null, entitlementId: string): EntitlementState`
  - `formatTrialEnd(expirationDate: string | null, locale?: string): string | null`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/entitlement.test.ts` with a `customerInfo` fixture cast through `unknown as CustomerInfo`. Assert:

```ts
// active normal
expect(entitlementState(info, 'prettycash_pro')).toEqual({
  isPro: true,
  isTrial: false,
  expirationDate: '2026-12-19T00:00:00Z',
  willRenew: true,
  managementURL: 'https://play.google.com/store/account/subscriptions?package=x',
});
// trial
expect(entitlementState(trialInfo, 'prettycash_pro').isTrial).toBe(true);
// inactive
expect(entitlementState(inactiveInfo, 'prettycash_pro')).toEqual({
  isPro: false, isTrial: false, expirationDate: null, willRenew: false, managementURL: null,
});
// null
expect(entitlementState(null, 'prettycash_pro').isPro).toBe(false);
// date
expect(formatTrialEnd('2026-11-26T12:00:00Z', 'en-US')).toBe('Nov 26');
expect(formatTrialEnd(null)).toBeNull();
expect(formatTrialEnd('not-a-date', 'en-US')).toBeNull();
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/__tests__/entitlement.test.ts --runInBand`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the helper**

`entitlementState` returns all-false/null for a null `CustomerInfo`; otherwise reads `customerInfo.entitlements.active[entitlementId]` and maps `periodType`, `expirationDate`, `willRenew`, and `customerInfo.managementURL`.

`formatTrialEnd` parses the ISO string, returns null for null/invalid, and uses `toLocaleDateString(locale, { month: 'short', day: 'numeric' })`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/lib/__tests__/entitlement.test.ts --runInBand`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/entitlement.ts src/lib/__tests__/entitlement.test.ts
git commit -m "feat: add RevenueCat entitlement state helper"
```

---

### Task 2: SDK lifecycle and new subscription fields

**Files:**
- Modify: `src/context/SubscriptionContext.tsx`
- Modify: `App.tsx`
- Modify: `src/services/billing.ts`
- Modify: `src/config.ts`

**Interfaces:**
- Consumes: `entitlementState`, `formatTrialEnd` from Task 1.
- Produces: context adds `isTrial: boolean`, `expirationDate: string | null`, `willRenew: boolean`, `managementURL: string`.
- Produces: `PLAY_STORE_SUBSCRIPTIONS_URL` constant in `src/config.ts`.
- Keeps the old trial fields temporarily until Task 3 so Profile/TabBar still compile.

- [ ] **Step 1: Add the Play Store fallback constant**

In `src/config.ts`:

```ts
export const PLAY_STORE_SUBSCRIPTIONS_URL =
  'https://play.google.com/store/account/subscriptions?package=com.mohamedahshik.prettycash';
```

- [ ] **Step 2: Simplify the backend entitlement type**

`src/services/billing.ts` becomes `{ isPro: boolean }` (extra response fields are ignored).

- [ ] **Step 3: Configure at startup and log in with Supabase**

In `SubscriptionContext.tsx`:

- Add `ensureConfigured(): string | null`: resolve the key; if null warn and return null; if `configuredApiKey !== apiKey`, call `Purchases.configure({ apiKey })` and store it; return the key.
- Add new fields to `SubscriptionContextValue` and derive them with `entitlementState`. Keep the old fields for now.
- Derive:

```ts
const state = entitlementState(customerInfo, ENTITLEMENT_ID);
const isPro =
  simulationOverride?.isPro ??
  (customerInfo ? state.isPro : Boolean(backendEntitlement?.isPro));
const isTrial = simulationOverride?.isTrial ?? state.isTrial;
const expirationDate = simulationOverride?.expirationDate ?? state.expirationDate;
const willRenew = state.willRenew;
const managementURL = state.managementURL ?? PLAY_STORE_SUBSCRIPTIONS_URL;
```

- Extend `SimulationOverride` with `isTrial` and `expirationDate` while keeping the old fields; update `simulate` so `trial` sets `isPro: true`, `isTrial: true`, expiration 7 days out; `pro` sets `isPro: true`, `isTrial: false`; `expired` sets both false.
- In `refresh`, call `ensureConfigured()` first; return if null. If a session exists, `await Purchases.logIn(session.user.id)`. Load `fetchEntitlement()`, `Purchases.getCustomerInfo()`, and `Purchases.getOfferings()` with `Promise.allSettled`; set fulfilled values and `console.warn` rejections. Do not blank one value because another failed.
- In the session effect, ensure configuration first. With a session, call `refresh` and register the customer-info listener. Without a session, clear state and call `Purchases.logOut().catch(...)`.
- Keep `presentRevenueCatPaywall` and Customer Center code for Task 3.

- [ ] **Step 4: Move the provider above the auth gate**

In `App.tsx`, wrap `Gate` directly:

```tsx
<AuthProvider>
  <SubscriptionProvider>
    <Gate />
  </SubscriptionProvider>
</AuthProvider>
```

Remove `SubscriptionProvider` from the authenticated `Bootstrap` return. The provider must mount at app startup so `ensureConfigured()` runs before any paywall/offering request.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npm test -- --runInBand`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add App.tsx src/config.ts src/context/SubscriptionContext.tsx src/services/billing.ts
git commit -m "feat: configure RevenueCat at startup and expose trial state"
```

---

### Task 3: Profile, TabBar, and removal of app-trial/Customer Center

**Files:**
- Modify: `src/screens/ProfileScreen.tsx`
- Modify: `src/components/TabBar.tsx`
- Modify: `src/context/SubscriptionContext.tsx`
- Delete: `src/lib/subscriptionState.ts`
- Delete: `src/lib/__tests__/subscriptionState.test.ts`

**Interfaces:**
- Consumes: `isPro`, `isTrial`, `expirationDate`, `managementURL`, `canScan`, `openPaywall`, `restorePurchases`, `simulate` from Task 2.
- Produces: context removes `isTrialActive`, `trialDaysLeft`, `trialEndsAt`, `dailyScansUsed`, `dailyLimit`, `recordScan`, `scanBlockReason`, `openCustomerCenter`.

- [ ] **Step 1: Update Profile**

- Destructure the new fields; remove the old trial fields and `openCustomerCenter`.
- Pro/trial: render a non-pressable status row (no chevron). Subtitle: `Trial active, ends ${formatTrialEnd(expirationDate)}` when `isTrial`, else `Unlimited AI receipt scans`.
- Not Pro: render the Pressable row with `onPress={openPaywall}` and `Unlock unlimited AI receipt scans`.
- Add a **Manage subscription** row when `isPro`: `open-in-new` icon, subtitle `Cancel or change in Google Play`, onPress `Linking.openURL(managementURL)` with a failure alert. `managementURL` always has the Play Store fallback.
- Keep the Restore Purchases row for `!isPro`.
- Update the dev simulator to `Fresh trial`, `Expired`, `Pro`, `Reset`; remove `Daily cap`.

- [ ] **Step 2: Update TabBar**

- Destructure `canScan`, `isTrial`, `expirationDate`, `openPaywall`; remove the old trial/daily fields and `recordScan`.
- `scan`/`gallery`: if `!canScan`, call `openPaywall()` and return; remove the daily trial-limit Alert and `recordScan` calls.
- Trial badge: `Trial ends ${formatTrialEnd(expirationDate)}` when `isTrial && expirationDate`; otherwise render nothing.
- Remove the now-unused `Alert` import if nothing else in `TabBar` uses it.

- [ ] **Step 3: Remove the dead state and Customer Center**

- Set `canScan = isPro`.
- Remove the old context fields, their calculations, and `recordScan`.
- Remove `presentCustomerCenter` and `openCustomerCenter`.
- Remove the `deriveTrial` / `isScanAllowed` imports.
- Delete `src/lib/subscriptionState.ts` and its test.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npm test -- --runInBand`
Expected: PASS (suite count drops by the removed test file).

- [ ] **Step 5: Commit**

```bash
git add src/components/TabBar.tsx src/context/SubscriptionContext.tsx src/screens/ProfileScreen.tsx
git rm src/lib/subscriptionState.ts src/lib/__tests__/subscriptionState.test.ts
git commit -m "feat: show RevenueCat trial state and store management link"
```

---

### Task 4: Quota error reconciliation, README, and docs

**Files:**
- Modify: `src/components/AnalysisErrorCard.tsx`
- Modify: `src/components/AddTransactionSheet.tsx`
- Modify: `src/components/__tests__/AddTransactionSheet.test.tsx`
- Modify: `README.md`
- Modify: `docs/architecture/10-subscriptions.md`
- Modify: `docs/specs/10-subscriptions/2026-11-19-play-trial-revenuecat-only-design.md`
- Modify: `docs/plans/10-subscriptions/2026-11-19-play-trial-revenuecat-only.md`
- Modify: `docs/plans/plans-index.md`

- [ ] **Step 1: Add the subscription error kinds**

In `AnalysisErrorCard.tsx`:

- Add `'subscription' | 'subscription-required'` to `AnalysisErrorKind`.
- Add `'upgrade'` to `AnalysisErrorAction`.
- Add copy:
  - `subscription`: title `Subscription is activating`, body `Google Play confirmed your subscription, but our server hasn't received it yet. Try again in a moment.`, primary `Try again` (`try-again`), secondary `Enter manually` (`enter-manually`).
  - `subscription-required`: title `PrettyCash Pro required`, body `Start your free trial or subscribe to scan receipts with AI.`, primary `View plans` (`upgrade`), secondary `Enter manually` (`enter-manually`).

- [ ] **Step 2: Map the backend error**

In `AddTransactionSheet.tsx`:
- Use `const { isPro, openPaywall } = useSubscription();`.
- In `failAnalysis`, when `analysisError?.code === 'SUBSCRIPTION_REQUIRED'`, set `kind` to `'subscription'` if `isPro`, otherwise `'subscription-required'`.
- In `handleErrorAction`, handle `'upgrade'` by calling `openPaywall()` and returning.

- [ ] **Step 3: Test the mapping**

In `AddTransactionSheet.test.tsx`, mock `useSubscription` with `{ isPro: true, openPaywall: jest.fn() }`, throw `new ReceiptAnalysisError('SUBSCRIPTION_REQUIRED', '...')` from `analyzeReceipt`, and assert `Subscription is activating` appears. Add a second case with `isPro: false` asserting `PrettyCash Pro required`.

- [ ] **Step 4: Write the README testing section**

Add the Play internal-testing/license-tester steps from spec §8, including: development build, live `goog_` public key, no secret key, new account for `free-trial-7d`, purchase/trial/restore/cancel/expiry checks, and product troubleshooting.

- [ ] **Step 5: Update architecture docs**

In `docs/architecture/10-subscriptions.md`, replace the app-managed trial/daily-cap/Customer Center sections with:
- Play `free-trial-7d` is full Pro; free users 0 scans.
- Entitlement `prettycash_pro`; `isTrial` from `periodType`.
- Backend quota is `is_pro` only.
- Management uses `CustomerInfo.managementURL` with the Play Store fallback.
- Update the code areas list to include `src/lib/entitlement.ts`; remove `subscriptionState.ts` and Customer Center references.

- [ ] **Step 6: Update statuses and index**

Set the spec and this plan to `Implemented; device verification pending.` Tick completed steps except the device checklist. Add `[[2026-11-19-play-trial-revenuecat-only]]` to the Subscriptions row in `docs/plans/plans-index.md`.

- [ ] **Step 7: Full checks**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npm test -- --runInBand`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/AnalysisErrorCard.tsx src/components/AddTransactionSheet.tsx src/components/__tests__/AddTransactionSheet.test.tsx README.md docs/architecture/10-subscriptions.md docs/specs/10-subscriptions/2026-11-19-play-trial-revenuecat-only-design.md docs/plans/10-subscriptions/2026-11-19-play-trial-revenuecat-only.md docs/plans/plans-index.md
git commit -m "docs: document Play trial and scan activation handling"
```

---

## Implementation status

Not started.
