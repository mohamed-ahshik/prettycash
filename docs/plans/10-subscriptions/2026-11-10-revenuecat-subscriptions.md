# RevenueCat Subscriptions & App-Managed AI Trial Implementation Plan

Implementation status: Core implementation complete; RevenueCat credentials, backend deployment, EAS build, and device verification pending

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the PrettyCash Pro paywall, RevenueCat purchase flow, app-managed 7-day trial (3 scans/day), developer simulation states, backend quota enforcement, and RevenueCat webhook synchronization.

**Architecture:** The React Native app owns the paywall and RevenueCat customer info; RevenueCat is the subscription source of truth. FastAPI owns scan quotas and RevenueCat webhook processing; Supabase stores cached Pro status and daily scan usage. Entitlement checks happen before every receipt analysis.

**Tech Stack:** Expo SDK 58, React Native, `react-native-purchases`, FastAPI, Supabase Postgres, pytest, Jest.

**Spec:** `docs/specs/10-subscriptions/2026-11-10-revenuecat-subscriptions-and-trial-design.md`

## Global Constraints

- Manual expense entry remains free forever.
- Free users after trial: 0 AI scans.
- New accounts: 7-day app-managed trial with 3 AI scans/day.
- Monthly/annual Pro: unlimited AI scans.
- No Google Play trial configuration; trial is app-managed.
- RevenueCat entitlement identifier: `prettycash_pro`.
- RevenueCat packages: `$rc_monthly`, `$rc_annual`.
- Product IDs: `monthly`, `yearly`.
- Backend must enforce quotas; the client is informational only.
- Never trust `isPro` from the client.
- RevenueCat webhook must be authenticated and idempotent.
- Expo Go cannot execute real purchases; use a development build for real checkout.
- Missing RevenueCat keys must show a clear unavailable state, never a fake purchase.

## Review Focus

- **Trial boundary:** a scan at 23:59 local time must count for that local day; the next day resets.
- **Trial expiry:** day 8 must not allow a scan even if the profile cache says otherwise.
- **Race after purchase:** a completed RevenueCat purchase must enable a scan without waiting for an app restart.
- **Quota bypass:** direct API calls without a valid Supabase JWT must be rejected.
- **Webhook replay:** duplicate RevenueCat events must not corrupt entitlement state.

---

### Task 1: Install RevenueCat and configure the app

**Files:**
- Modify: `package.json`
- Modify: `app.json` / `app.config.ts`
- Modify: `.env.example`
- Test: none (build-level)

- [x] Install: `npx expo install react-native-purchases react-native-purchases-ui`.
- [x] Add `EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY=` and `EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY=` placeholders to `.env.example`.
- [x] Add privacy/terms URL env placeholders.
- [x] Confirm no RevenueCat config plugin is required; development build is required.

### Task 2: Subscription state model

**Files:**
- Create: `src/lib/subscriptionState.ts`
- Create: `src/lib/__tests__/subscriptionState.test.ts`
- Create: `src/context/SubscriptionContext.tsx`
- Modify: `App.tsx`

**Interfaces:**
- `deriveTrial({ createdAt, now, isPro }): { isTrialActive, trialDaysLeft, trialEndsAt }`
- `canUseAiScan({ isPro, isTrialActive, dailyScansUsed, dailyLimit }): boolean`
- Context exposes `isPro`, `isTrialActive`, `trialDaysLeft`, `dailyScansUsed`, `dailyLimit`, `canScan`, `offerings`, `purchasePackage`, `restorePurchases`, `refresh`, `simulate`.

- [x] Write failing tests for trial days left, day-7 expiry, day-8 no access, and daily cap.
- [x] Implement pure derivation helpers.
- [x] Add `SubscriptionProvider` around the authenticated app tree.
- [x] Configure RevenueCat with Supabase `user.id`; handle missing API key gracefully.
- [x] Add CustomerInfo listener and entitlement refresh.
- [x] Add dev simulation override state.

### Task 3: Paywall UI

**Files:**
- Create: `src/components/ProPaywallModal.tsx`
- Modify: `src/screens/ProfileScreen.tsx`
- Modify: `src/components/TabBar.tsx` / `src/components/SplitAddButton.tsx`
- Test: `src/components/__tests__/ProPaywallModal.test.tsx`

- [x] Render monthly/annual packages with localized RevenueCat prices.
- [x] Render app-managed trial copy.
- [x] Add close, restore, Privacy Policy, Terms, and compliance disclosures.
- [x] Add loading, unavailable, purchase-error, and success states.
- [x] Add a Profile entry point (“PrettyCash Pro”).
- [x] Open the paywall from gated camera actions.

### Task 4: Camera and trial gating

**Files:**
- Modify: `src/components/SplitAddButton.tsx`
- Modify: `src/components/TabBar.tsx`
- Modify: `src/components/AddTransactionSheet.tsx`
- Modify: `src/screens/ProfileScreen.tsx`

- [x] Pro → open camera/gallery immediately.
- [x] Trial under daily cap → open camera/gallery with “X days left · Y scans left today”.
- [x] Trial at cap → show daily-limit sheet with “Upgrade to Pro” and “Enter Manually”.
- [x] Expired/free → show paywall; manual entry remains available.
- [x] Add the dev simulator states to Profile.

### Task 5: Backend quota and profile sync

**Files (backend repo):**
- Create migration `supabase/migrations/0002_subscriptions_and_scan_usage.sql`
- Modify `app/core/config.py`
- Modify `app/store/supabase.py`
- Modify `app/api/deps.py`
- Modify `app/api/v1/receipt.py`
- Create `app/api/v1/billing.py`
- Modify `app/api/v1/router.py`
- Tests: `tests/test_billing.py`, `tests/test_api_receipt.py`

- [x] Add `profiles.is_pro` and `profiles.pro_source`.
- [x] Add `scan_usage(user_id, usage_date, scan_count)` with unique constraint.
- [x] Add authenticated Supabase user dependency.
- [x] Add quota check/increment before receipt job creation.
- [x] Return `DAILY_TRIAL_LIMIT_REACHED` / `SUBSCRIPTION_REQUIRED`.
- [x] Add RevenueCat webhook with shared-secret auth and idempotent updates.
- [x] Add backend tests for trial cap, expiry, and Pro unlimited.
- [ ] Add a duplicate-webhook-event test.

### Task 6: Receipt client authentication

**Files:**
- Modify: `src/services/receiptAnalysis.ts`
- Modify: `src/services/__tests__/receiptAnalysis.test.ts`
- Modify: `src/lib/supabase.ts` or add session-token helper

- [x] Send Supabase access token as `Authorization`.
- [x] Send vision key as `X-API-Key` (backend change coordinated).
- [x] Parse 403 quota errors into a typed error code.
- [ ] Trigger the paywall or daily-limit state from receipt API quota errors.

### Task 7: Verification

- [x] Frontend Jest tests pass.
- [x] Backend pytest suite passes.
- [x] TypeScript passes.
- [x] Web export still builds.
- [ ] EAS development build with `react-native-purchases`.
- [ ] RevenueCat sandbox/product-loading verification.
- [ ] Trial/day/quota simulator verification.
- [ ] Webhook verification with a test event.

## External dependencies

- RevenueCat project and API keys.
- Google Play subscription products.
- Backend deployed at public HTTPS.
- RevenueCat webhook URL and shared secret.
- EAS development build.

## Production environment gaps

The EAS **production** environment carries the RevenueCat **live Play key** (`goog_...`), so Play builds configure the Google Play store rather than the Test Store.

The key alone does not sell anything: Play subscriptions must exist and be attached to the `default` offering, or the SDK loads an empty offering.

To close it:

- [x] Create the RevenueCat Google Play app in the project.
- [ ] Confirm the Play service account credentials validate (RevenueCat → Apps → Play app → credentials status; up to 36 hours).
- [x] Replace the Test Store key with the live `goog_...` project key.
- [x] Upload it: `eas env:create production --name EXPO_PUBLIC_REVENUECAT_API_KEY --visibility sensitive --scope project`.
- [ ] Add `EXPO_PUBLIC_PRIVACY_POLICY_URL` and `EXPO_PUBLIC_TERMS_URL` to production (the paywall legal links fall back to placeholders).
- [ ] Create the Play subscriptions and attach them to the `default` offering.
- [ ] Confirm the offering resolves real Play products rather than Test Store products.
