# Play Trial + RevenueCat-Only Subscription Design

**Date:** 2026-11-19
**Status:** Approved
**Implementation status:** Not started.

**Branches:**
- Frontend: `mohamedahshik/addPayment`
- Backend: `mohamedahshik/addTrialPeriod`

---

## 1. Intent

Move PrettyCash Pro to a **Play-managed 7-day free trial** and make RevenueCat the single source of subscription truth.

The current app runs its own 7-day trial (3 scans/day, derived from account age) and a separate backend trial. Enabling the Play trial without removing the app trial would grant two trials. This design removes the app-managed trial entirely.

## 2. Product model

- Google Play subscription: `prettycash_pro`
  - base plan `monthly`
  - base plan `annual`
  - offer `free-trial-7d`, new customers only, on **both** base plans
- RevenueCat entitlement: `prettycash_pro`
- RevenueCat offering: `default` (current) with `$rc_monthly` / `$rc_annual`
- Trial is **full Pro**: unlimited AI receipt scans
- Manual expense/income tracking remains free
- In-app management is a single **Manage subscription** link that opens RevenueCat's `CustomerInfo.managementURL` (the Google Play subscription-management screen), falling back to the generic Play Store subscriptions page when RevenueCat returns no URL. No Customer Center.

| State | Entitlement | AI scans |
|---|---|---|
| No entitlement | inactive | 0 |
| Play trial (`periodType === "TRIAL"`) | active | Unlimited |
| Active Pro | active | Unlimited |
| Grace period | active | Unlimited |
| Expired / paused / on hold | inactive | 0 |

## 3. Frontend state model

Replace the app-managed trial fields with RevenueCat-derived fields.

`src/context/SubscriptionContext.tsx` exposes:

```ts
interface SubscriptionContextValue {
  isPro: boolean;
  isTrial: boolean;
  expirationDate: string | null;
  willRenew: boolean;
  managementURL: string;
  canScan: boolean;
  offerings: PurchasesOfferings | null;
  simulation: SimulationMode;
  openPaywall: () => void;
  restorePurchases: () => Promise<boolean>;
  refresh: () => Promise<void>;
  simulate: (mode: SimulationMode) => void;
}
```

Derivation:

```ts
const entitlement = customerInfo?.entitlements.active['prettycash_pro'];

const isPro =
  simulationOverride?.isPro ??
  (customerInfo ? entitlement != null : Boolean(backendEntitlement?.isPro));

const isTrial =
  simulationOverride?.isTrial ?? (entitlement?.periodType === 'TRIAL');

const expirationDate =
  simulationOverride?.expirationDate ?? entitlement?.expirationDate ?? null;

const willRenew = entitlement?.willRenew ?? false;
const managementURL = customerInfo?.managementURL ?? PLAY_STORE_SUBSCRIPTIONS_URL;
const canScan = isPro;
```

`PLAY_STORE_SUBSCRIPTIONS_URL` is a single constant in `src/config.ts`:

```ts
export const PLAY_STORE_SUBSCRIPTIONS_URL =
  'https://play.google.com/store/account/subscriptions?package=com.mohamedahshik.prettycash';
```

- RevenueCat `CustomerInfo` wins whenever it is loaded.
- The backend `isPro` cache is used only while `customerInfo` is still `null` (startup/offline), so the UI does not flash the paywall.
- `periodType` values are `NORMAL`, `INTRO`, `TRIAL`, `PREPAID`; only `TRIAL` sets `isTrial`.
- No local date math, timers, or local storage for trial state.

Extract the CustomerInfo derivation into a pure helper, `src/lib/entitlement.ts`:

```ts
interface EntitlementState {
  isPro: boolean;
  isTrial: boolean;
  expirationDate: string | null;
  willRenew: boolean;
  managementURL: string | null;
}

export function entitlementState(
  customerInfo: CustomerInfo | null,
  entitlementId: string,
): EntitlementState;
```

The context applies simulation overrides and the startup backend fallback on top. The helper is unit-tested for active, trial, expired, and missing CustomerInfo.

Remove:

- `src/lib/subscriptionState.ts` and its test (`deriveTrial`, `canUseAiScan`, `isScanAllowed`, daily limits).
- Context fields `isTrialActive`, `trialDaysLeft`, `trialEndsAt`, `dailyScansUsed`, `dailyLimit`, `recordScan`, `scanBlockReason`, `openCustomerCenter`.
- `presentCustomerCenter` and all Customer Center code. RevenueCat UI stays only for the hosted paywall.

Simulation modes become `'trial' | 'expired' | 'pro' | null`:

- `trial` → `isPro: true`, `isTrial: true`, expiration 7 days out
- `pro` → `isPro: true`, `isTrial: false`
- `expired` → `isPro: false`, `isTrial: false`
- `null` → use live values

## 4. SDK lifecycle

- Keep all `Purchases.*` calls in `SubscriptionContext.tsx`; the hosted UI package is used only for `presentPaywallIfNeeded`.
- Resolve the **public** Google SDK key through `src/lib/revenuecatKey.ts`. Never bundle or call the RevenueCat secret key.
- **Configure at app startup:** move `SubscriptionProvider` inside `AuthProvider` but above `Gate` (today it only mounts inside the authenticated tree). It calls `Purchases.configure({ apiKey })` once, before any offering or paywall request. RevenueCat may use an anonymous app user ID until sign-in.
- Use the Supabase user ID as the RevenueCat app user ID after auth: `Purchases.logIn(session.user.id)`. The backend webhook matches `app_user_id` to `profiles.user_id`.
- `SubscriptionProvider.refresh()` must not configure a second time; it ensures configuration, logs in, then loads data. Keep the `configuredApiKey` guard.
- In `refresh()`, finish configuration/login **before** loading backend entitlement, customer info, and offerings, so no store call runs against an unconfigured SDK.
- Load `getCustomerInfo()`, `getOfferings()`, and the backend entitlement independently with `Promise.allSettled`; one failure must not blank the others.
- Keep the `configuredApiKey` guard.
- On sign-out, call `Purchases.logOut().catch(...)` so a previous customer is not retained.
- Keep `addCustomerInfoUpdateListener` / `removeCustomerInfoUpdateListener`; after purchase, restore, or expiry, the context updates from `CustomerInfo` without restarting.
- RevenueCat requires a **development build** (or production build); Expo Go cannot load store products or the hosted paywall. Rebuild after changing native RevenueCat packages.

## 5. Paywall

Use the existing RevenueCat hosted paywall (`presentPaywallIfNeeded` with `requiredEntitlementIdentifier: 'prettycash_pro'`).

- `free-trial-7d` is attached to the Play base plans and the RevenueCat products. The app does not hardcode the offer ID or render its own trial CTA.
- The hosted paywall shows the localized Monthly/Annual prices and the Play intro offer.
- Eligibility-aware copy is configured with a RevenueCat **Offer type** rule:
  - `Introductory offer` rule → show the trial component/CTA, using `{{ product.offer_period_with_unit }}` (e.g. `1 week`) and offer variables.
  - No offer / ineligible → show the normal `Subscribe` copy and regular price.
  - RevenueCat requires `offer_*` variables to live inside an Offer type text rule or an Offer type visibility rule; the editor blocks saving them outside that context.
- Eligibility ("new customers only") is enforced by Google Play at purchase time; RevenueCat's Offer type rules control what the paywall displays for eligible vs ineligible customers.
- The app does not verify eligibility itself and never renders a second trial CTA.
- The hosted paywall owns loading, empty-offering, purchase-in-progress, pending, cancellation, and purchase-error states. The app never renders a second paywall.
- If the paywall cannot be presented (missing UI, `ERROR`, thrown error, no offering), log the RevenueCat error and show the existing temporarily-unavailable alert with **Try again** / **Not now**. Do not crash.
- Pending purchases must not be treated as success or failure; the CustomerInfo listener resolves the final state.
- Keep `PURCHASED` / `RESTORED` → refresh, `ERROR` → logged temporarily-unavailable alert, `NOT_PRESENTED` / `CANCELLED` → silent.
- Keep the hosted paywall's restore path and the Profile Restore Purchases row for non-Pro users.

## 6. Profile & tab bar

### Profile — status + store management link

Replace the state-aware Pressable with two presentations:

- **Pro (including trial):** a non-pressable status row with the crown icon and no chevron.
  - trial: `Trial active, ends <formatted expirationDate>` (device locale, e.g. `Nov 26`; fall back to `Trial active` if the date is null)
  - active: `Unlimited AI receipt scans`
- **Not Pro:** a Pressable row that opens the hosted paywall, subtitle `Unlock unlimited AI receipt scans`, chevron retained.

Below the Pro status row, always render a **Manage subscription** row when `isPro`:

- Subtitle: `Cancel or change in Google Play`
- Icon: `open-in-new`
- Press: `Linking.openURL(managementURL)`
- `managementURL` is the RevenueCat `CustomerInfo.managementURL`, or `PLAY_STORE_SUBSCRIPTIONS_URL` when RevenueCat returns null.
- If opening fails, alert `Could not open Google Play. Manage your subscription in Play Store > Payments & subscriptions.`

There is no RevenueCat Customer Center. The `managementURL` is supplied by RevenueCat from `CustomerInfo` and points at Google Play's subscription-management screen, satisfying Google Play's in-app cancellation requirement.

Keep the Restore Purchases row for `!isPro`.

### Tab bar

- Remove the daily trial-limit alerts and `recordScan` calls.
- If `!canScan`, open the paywall directly; manual entry remains available elsewhere.
- When `isTrial && expirationDate`, show a small badge: `Trial ends <formatted date>`; otherwise no badge.

## 7. Backend contract — `PrettyCash-Backend` (`addTrialPeriod`)

RevenueCat's webhook is the only subscription source. A trial's `INITIAL_PURCHASE` already sets `profiles.is_pro = true`, so the backend treats a trial as Pro.

### `app/services/quota.py`

- Reduce `Entitlement` to `is_pro`, `can_scan`, `block_reason`.
- Remove account-age trial logic, `trial_days`, `daily_limit`, `_usage`, timezone/date helpers.
- `evaluate_entitlement(profile)`:
  - `is_pro` → can scan
  - otherwise → `subscription_required`
- `QuotaService.entitlement` no longer reads `scan_usage`.
- `QuotaService.consume_scan` allows Pro and raises `SubscriptionRequiredError` otherwise; no `scan_usage` writes.

### `app/api/v1/billing.py`

Return:

```json
{
  "isPro": true,
  "canScan": true,
  "blockReason": null
}
```

Remove `inTrial`, `trialDaysLeft`, `dailyScansUsed`, `dailyLimit`.

### Config, errors, tests

- Remove `trial_days` and `trial_daily_scan_limit` from `app/core/config.py` and `TRIAL_DAYS` / `TRIAL_DAILY_SCAN_LIMIT` from `.env.example`.
- Remove `DailyTrialLimitError` / `DAILY_TRIAL_LIMIT_REACHED` if nothing else uses them.
- Keep the `scan_usage` table and migration for historical data; nothing writes to it after this change.
- Scan analytics stay in PostHog (`receipt_analysis_started`, `receipt_analysis_completed`, `receipt_analysis_failed`, `$ai_generation`); no replacement event is needed.
- Update `tests/test_quota.py`, `tests/test_api_receipt.py`, `tests/conftest.py`, and billing payload tests.
- Add webhook tests for trial activation and `BILLING_ISSUE` not revoking access.
### Webhook mapping

- Active: `INITIAL_PURCHASE`, `RENEWAL`, `UNCANCELLATION`, `PRODUCT_CHANGE`.
- Inactive: `EXPIRATION`, `SUBSCRIPTION_PAUSED`.
- `CANCELLATION` (auto-renew off) and `BILLING_ISSUE` **do not revoke access**; the entitlement remains active through the paid/grace period and is revoked by `EXPIRATION`.
- A trial's `INITIAL_PURCHASE` is an active event.
- Add tests proving a trial purchase grants access and `BILLING_ISSUE` does not revoke it.

### Frontend backend client

`src/services/billing.ts` becomes `{ isPro: boolean }` (or keeps extra fields ignored). It is only a startup fallback for `isPro`.

**Reconciliation:** the RevenueCat webhook may land a few seconds after a purchase while the app already shows `isPro`. If the receipt API returns `SUBSCRIPTION_REQUIRED` during that window, show a specific "Your subscription is still activating. Try again shortly." message instead of a generic analysis error. Do not grant local access to bypass the backend.

## 8. README testing notes

Add a **Testing subscriptions** section to `README.md`:

1. Upload the build to the Play Console **internal testing** track.
2. Add test accounts under **License testing**.
3. Install from the Play **testing link**; side-loaded builds do not load Play products.
4. Use a development or production build, not Expo Go, and carry the live `goog_...` public RevenueCat key.
5. Never put the RevenueCat secret key in the app or repository.
6. Test with a **new** Play account to receive `free-trial-7d`; used trials are not offered again.
7. Verify purchase, trial start, unlimited scans, restore, cancellation, and expiry.
8. If products do not appear, check Play product activation, RevenueCat service-account credentials, and that the `default` offering is current.

## 9. Manual configuration

- Play Console: create/activate `prettycash_pro` with base plans `monthly` and `annual`; add offer `free-trial-7d` to both.
- RevenueCat: attach both products to `prettycash_pro`; put `$rc_monthly` / `$rc_annual` in the `default` offering; mark it current.
- RevenueCat Paywall editor: publish the paywall, attach it to the `default` offering, and set trial-aware copy, Privacy, Terms, and auto-renew disclosure.
- EAS: confirm `EXPO_PUBLIC_REVENUECAT_API_KEY` (or the Google-specific key) is present in each environment.
- Backend: set `REVENUECAT_WEBHOOK_AUTH_TOKEN` and verify webhook delivery.

### Documentation

- Update `docs/architecture/10-subscriptions.md` in the app: remove the app-managed trial, daily scan cap, and Customer Center; document the RevenueCat-only trial/quota model.
- Update the backend architecture and API docs for the simplified entitlement payload and quota rules.
- Add the README testing section from §8.

## 10. Out of scope

- Custom paywall or custom trial-eligibility CTA.
- RevenueCat Customer Center. The only in-app management is the `managementURL` link.
- Persisting `expiration_at_ms`/grace-period dates in the backend; access remains until `EXPIRATION`.
- `TRANSFER` event handling for cross-account subscription moves.
- iOS/App Store.
- Using `scan_usage` for analytics or rate limits; PostHog covers scan analytics.
- Database migrations.

## 11. Verification

Frontend:

- Entitlement helper tests: active, trial, expired, missing CustomerInfo, and `managementURL` present/null.
- New user: `canScan === false`; tapping scan opens the hosted paywall.
- Paywall shows Monthly/Annual and the Play trial for eligible accounts.
- Start trial → `isPro === true`, `isTrial === true`, unlimited scans.
- Profile shows `Trial active, ends <date>`; the Pro status row has no chevron and no tap action.
- Pro/trial → **Manage subscription** row always appears; tapping opens the RevenueCat `managementURL`.
- RevenueCat returns `managementURL === null` → the row still appears and opens the generic Play Store subscriptions URL.
- No Customer Center appears in either case.
- Trial expires → `isPro === false`; scans blocked; paywall returns.
- Restore on a second install → entitlement restored.
- Customer info listener updates after purchase/restore without restart.
- `npx tsc --noEmit`, Jest suite.

Backend:

- Unsubscribed profile → `canScan: false`, `blockReason: "subscription_required"`.
- `is_pro: true` → unlimited, regardless of scan count.
- Missing profile → blocked.
- Trial `INITIAL_PURCHASE` webhook → `is_pro: true`.
- PostHog still records the receipt-analysis events after `scan_usage` writes are removed.
- pytest suite.

Device:

- Install from the Play internal testing link with a license tester.
- Complete `free-trial-7d`, verify the trial starts and scans are unlimited.
- Cancel/expire and verify the blocked state.

## 12. Implementation status

Not started.
