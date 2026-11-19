# 10 — Subscriptions

Implementation status: RevenueCat-only entitlement, Play trial, hosted paywall, backend quota/webhook routes, and Play Store management link implemented; Play products, credential validation, deployment, and device verification pending.

## Purpose

Own the PrettyCash Pro subscription lifecycle: Store products, RevenueCat entitlements, receipt-scan quotas, and subscription webhooks.

## Responsibilities

- Present monthly and annual Pro plans with localized Google Play prices in the hosted RevenueCat paywall.
- Treat the Play `free-trial-7d` offer as full Pro.
- Process authenticated RevenueCat webhook events on the backend.
- Use RevenueCat as the subscription source of truth.
- Enforce the Pro-only scan quota on the backend.
- Synchronize subscription state from RevenueCat webhooks.
- Expose entitlement/quota state to the app.
- Provide restore purchases and Google Play subscription-management paths.

## Product model

- Google Play subscription: **`prettycash_pro`**
  - base plan `monthly` — monthly
  - base plan `annual` — annual
  - offer `free-trial-7d`, new customers only, on both base plans
- RevenueCat packages: `$rc_monthly`, `$rc_annual`
- Play trial: full Pro — unlimited AI receipt scans
- Free and expired users: 0 AI scans; manual expense/income tracking stays free

## Entitlement and quota model

| State | Entitlement | AI scans |
|---|---|---|
| No entitlement | inactive | 0 |
| Play trial (`periodType === 'TRIAL'`) | active | Unlimited |
| Active Pro | active | Unlimited |
| Grace period | active | Unlimited |
| Expired / paused / on hold | inactive | 0 |

`src/lib/entitlement.ts` derives `isPro`, `isTrial`, `expirationDate`, `willRenew`, and `managementURL` from `CustomerInfo`. `isTrial` is true only when the entitlement `periodType` is `TRIAL`; there are no local timers, local storage, or account-age calculations.

The backend quota is `is_pro` only. RevenueCat's webhook sets `profiles.is_pro`, and a trial's `INITIAL_PURCHASE` counts as active. The `scan_usage` table is retained for historical data but is no longer written or read for quota.

## Primary code areas

- App:
  - `src/context/SubscriptionContext.tsx` (implemented)
  - `src/lib/entitlement.ts` (implemented)
  - `src/lib/revenuecatKey.ts` (public SDK key resolution)
  - `src/lib/paywallResult.ts` (hosted paywall result mapping)
  - `src/services/billing.ts` (startup `isPro` fallback)
  - `src/services/receiptAnalysis.ts` (propagates `SUBSCRIPTION_REQUIRED`)
  - `src/components/AddTransactionSheet.tsx` / `src/components/AnalysisErrorCard.tsx` (`SUBSCRIPTION_REQUIRED` handling)
  - `src/context/AuthContext.tsx` (access token)
- Backend:
  - `app/api/v1/billing.py` (RevenueCat webhook + entitlement)
  - `app/services/quota.py` (`is_pro` scan quota)
  - `app/api/deps.py` (Supabase JWT + API key authentication)
  - `app/api/v1/receipt.py` (quota enforcement)
  - `app/core/config.py` (RevenueCat webhook config)
- Supabase:
  - `profiles.is_pro` (cached entitlement)
  - `scan_usage` table (historical only)
  - RLS policies
- EAS/native:
  - `react-native-purchases` development build
  - Google Play products and the `free-trial-7d` offer
  - RevenueCat project, offerings, entitlement, hosted paywall, and webhook

## Purchase flow

```text
Hosted RevenueCat paywall
  → localized Play prices and the free-trial-7d offer
  → native Google Play checkout
  → CustomerInfo entitlement updates
  → backend entitlement refresh
  → RevenueCat webhook updates profiles.is_pro
```

## Scan activation lag

The backend can return `SUBSCRIPTION_REQUIRED` after Google Play has confirmed a purchase but before the RevenueCat webhook has set `profiles.is_pro`. While `isPro` is true, the app shows **Subscription is activating** with **Try again** and **Enter manually**; it never grants local scan access to bypass the backend. While `isPro` is false, the same error shows **PrettyCash Pro required** with **View plans**, which opens the hosted paywall. Manual entry remains available from both cards.

## Subscription management

The app opens `CustomerInfo.managementURL`, which RevenueCat resolves to the Google Play subscription-management screen. When RevenueCat returns no URL, `PLAY_STORE_SUBSCRIPTIONS_URL` in `src/config.ts` opens the generic Play Store subscriptions page.

There is no RevenueCat Customer Center; the `managementURL` link satisfies Google Play's in-app cancellation requirement.

## Paywall presentation results

`presentPaywallIfNeeded` resolves one of five values; `src/lib/paywallResult.ts` maps them:

| Result | Meaning | Action |
|---|---|---|
| `PURCHASED` | Purchase completed in the paywall | Refresh entitlement |
| `RESTORED` | Restore completed in the paywall | Refresh entitlement |
| `ERROR` | Paywall failed to load or purchase errored | Log the error and show the temporarily-unavailable alert with Try again |
| `NOT_PRESENTED` | User already holds `prettycash_pro` — the paywall was skipped | Do nothing |
| `CANCELLED` | User dismissed the paywall | Do nothing |

`NOT_PRESENTED` is the subtle one: it is a *success* signal, not a failure. Treating it as an error offers an upgrade screen to a customer who is already paying.

> There is no local fallback paywall. If the hosted paywall cannot load, the app logs the RevenueCat error and shows a temporarily-unavailable alert. Restore Purchases remains available from Profile for non-Pro users.

## Server authority

The backend derives the user from the Supabase JWT. RevenueCat validates store receipts and sends authenticated webhook events; the backend enforces scan quotas and never trusts a client-supplied user ID or local `isPro` flag.

## SDK key selection

`src/lib/revenuecatKey.ts` resolves the public SDK key before `Purchases.configure()`:

| Order | Variable | Notes |
|---|---|---|
| 1 | `EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY` | Android only |
| 2 | `EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY` | iOS only |
| 3 | `EXPO_PUBLIC_REVENUECAT_API_KEY` | Shared fallback |

Platform keys win over the shared key, so a stale shared value cannot shadow a live store key.

A `test_...` key is a **Test Store** key: purchases complete without real billing. It is accepted in every build, including release. In a release build the provider logs a warning instead of blocking:

```text
[RevenueCat] Using a Test Store key in a release build.
Purchases will not be billed. Replace it with a live store key before publishing.
```

The warning is not a guarantee. A Test Store key left in place for a public release grants `prettycash_pro` to every customer for free, silently, with no error anywhere. Replace it with a live `goog_...` / `appl_...` key before publishing.

### Production environment

EAS **production** carries the live `goog_...` key, so release builds configure the Google Play store rather than the Test Store. The key is valid against the RevenueCat API.

It is not sufficient on its own: the Play subscriptions must exist and be attached to the `default` offering, or the SDK loads an empty offering and the hosted paywall shows no packages. The service account credentials must also validate before RevenueCat can read Play products.

Remaining work is tracked in [[2026-11-19-play-trial-revenuecat-only]].

## Boundaries

- The categories, transactions, insights, and receipt-analysis features consume entitlement decisions but do not own billing.
- The backend owns webhook processing and quota enforcement.
- RevenueCat owns subscription state; Google Play owns prices and payment execution.

## Related documentation

- [[2026-11-19-play-trial-revenuecat-only-design]]
- [[2026-10-31-google-play-subscriptions-design]]
- [[architecture-index|Back to architecture index]]
