# 10 — Subscriptions

Implementation status: Frontend paywall/trial simulator, backend quota/webhook routes, schema, and receipt JWT auth implemented; RevenueCat entitlement, offering, hosted paywall, and live `goog_` key in EAS production configured; Play products, credential validation, deployment, and device verification pending.

## Purpose

Own the PrettyCash Pro subscription lifecycle: Store products, RevenueCat entitlements, receipt-scan quotas, and subscription webhooks.

## Responsibilities

- Present monthly and annual Pro plans with localized Google Play prices.
- Run the native Google Play billing purchase flow.
- Send purchase tokens to the backend for server-side verification.
- Use RevenueCat as the subscription source of truth.
- Enforce free and trial scan quotas on the backend.
- Synchronize subscription state from RevenueCat webhooks.
- Expose entitlement/quota state to the app.
- Provide restore purchases and billing recovery paths.

## Product model

- Google Play subscription: **`prettycash_pro`**
  - base plan `monthly` — monthly
  - base plan `annual` — annual
- RevenueCat packages: `$rc_monthly`, `$rc_annual`
- Post-trial Pro: unlimited AI receipt scans

## Entitlement and quota model

| State | Pro access | Scan limit |
|---|---|---|
| Free | No | 4 per month |
| Pro trial | Yes | 3 per day |
| Active Pro | Yes | Unlimited |
| Grace period | Yes | Unlimited |
| On hold / paused / expired | No | Free rules |

Quota periods use `profiles.timezone`; usage is recorded by the backend.

## Primary code areas

- App:
  - `src/context/SubscriptionContext.tsx` (implemented)
  - `src/services/billing.ts` (planned)
  - `src/services/receiptAnalysis.ts` (quota handling changes)
  - `src/context/AuthContext.tsx` (access token)
- Backend:
  - `app/api/v1/billing.py` (RevenueCat webhook + entitlement)
  - `app/services/quota.py` (trial and scan quota)
  - `app/api/deps.py` (Supabase JWT + API key authentication)
  - `app/api/v1/receipt.py` (quota enforcement)
  - `app/core/config.py` (trial and RevenueCat webhook config)
- Supabase:
  - `subscriptions` table (planned)
  - `scan_usage` table (planned)
  - RLS policies
- EAS/native:
  - `react-native-purchases` development build
  - Google Play products
  - RevenueCat project, offerings, entitlement, and webhook

## Purchase flow

```text
Paywall
  → fetch RevenueCat offerings and localized prices
  → RevenueCat purchase Package
  → native Google Play checkout
  → CustomerInfo entitlement updates
  → backend entitlement refresh
  → RevenueCat webhook updates profiles.is_pro
```

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

A `test_...` key is a **Test Store** key: purchases complete without real billing. It is accepted in every build, including release, so internal-testing builds delivered through Google Play can exercise the paywall before live billing exists. In a release build the provider logs a warning instead of blocking:

```text
[RevenueCat] Using a Test Store key in a release build.
Purchases will not be billed. Replace it with a live store key before publishing.
```

The warning is not a guarantee. A Test Store key left in place for a public release grants `prettycash_pro` to every customer for free, silently, with no error anywhere. Replace it with a live `goog_...` / `appl_...` key before publishing.

### Production environment

EAS **production** carries the live `goog_...` key, so release builds configure the Google Play store rather than the Test Store. The key is valid against the RevenueCat API.

It is not sufficient on its own: the Play subscriptions must exist and be attached to the `default` offering, or the SDK loads an empty offering and the hosted paywall shows no packages. The service account credentials must also validate before RevenueCat can read Play products.

Remaining work is tracked in [[2026-11-10-revenuecat-subscriptions]] under *Production environment gaps*.

## Boundaries

- The categories, transactions, insights, and receipt-analysis features consume entitlement decisions but do not own billing.
- The backend owns verification and quota accounting.
- RevenueCat owns subscription state; Google Play owns prices and payment execution.

## Related documentation

- [[2026-10-31-google-play-subscriptions-design]]
- [[architecture-index|Back to architecture index]]
