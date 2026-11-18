# Google Play Subscriptions with Receipt Scan Quotas

Implementation status: Spec only; implementation not started.

## 1. Goal

Add a Google Play subscription called **PrettyCash Pro** that removes the AI receipt scan limit. Provide monthly and annual plans with a 7-day free trial, verify purchases server-side, keep entitlements synchronized with Google Play RTDN, and enforce a fair free/trial quota.

## 2. Product definition

| Product ID | Billing period | Free trial | Post-trial entitlement |
|---|---|---|---|
| `prettycash_pro_monthly` | Monthly | 7 days | Unlimited receipt scans |
| `prettycash_pro_annual` | Annual | 7 days | Unlimited receipt scans |

Both products belong to one Google Play subscription group: **PrettyCash Pro**. Google Play enforces trial eligibility per user/subscription group.

Prices are configured in Google Play Console and fetched at runtime. The app must never hard-code localized prices.

## 3. Quotas

| User state | Limit | Reset period |
|---|---|---|
| Free | 4 receipt scans | Calendar month |
| Pro trial | 3 receipt scans per day | Calendar day |
| Active Pro | Unlimited | — |

- Quota periods use the user's stored IANA timezone (`profiles.timezone`).
- A scan is counted when the analysis job is accepted, not when it completes.
- When a free user reaches 4 scans, the app shows the Pro paywall.
- When a trial user reaches 3 scans in a day, the app shows a “resume tomorrow” state; they remain in the trial and do not lose Pro access.
- If the subscription expires, grace period/on-hold behavior is determined by Google Play status and the entitlement state.

## 4. Entitlement model

The backend derives entitlement from the subscription table:

- `active`: full Pro access, unlimited scans.
- `trialing`: Pro UI state, but 3 scans/day.
- `grace_period`: retain Pro access until Google's grace period ends.
- `on_hold`: no new scans; allow billing recovery.
- `paused`, `canceled`, `expired`, `pending`: no Pro access.

The app does not grant Pro based on a local boolean alone. It uses the backend entitlement response.

## 5. Client architecture

### Library

Use `expo-iap` with a development build:

- Google Play Billing Library 9.1.0 under the hood.
- Not available in Expo Go.
- Android-first; iOS can be added later with StoreKit configuration.

### Components

- `src/context/SubscriptionContext.tsx` — entitlement, products, purchase state, refresh.
- `src/services/billing.ts` — expo-iap setup, product fetch, purchase, restoration.
- `src/components/ProPaywall.tsx` — paywall UI.
- `src/screens/ProScreen.tsx` or modal entry from Profile.
- `src/services/receiptAnalysis.ts` — sends Supabase JWT and handles quota errors.
- `src/context/AuthContext.tsx` — exposes session access token for backend calls.

### Paywall requirements

- Dynamic plan name, localized Play price, and billing period.
- Dynamic trial copy: “Try 7 days free, then <localized price>/month/year.”
- Renewal and cancellation disclosure adjacent to CTA.
- Privacy Policy and Terms of Service links.
- Visible close button.
- Restore Purchases button.
- Loading and error states.
- Clear behavior when products cannot be loaded; never show a fake price.

### Purchase flow

```text
initConnection
  → fetchProducts(['prettycash_pro_monthly', 'prettycash_pro_annual'])
  → render localized prices
  → user selects plan
  → requestPurchase
  → Google Play checkout
  → purchaseUpdatedListener
  → POST purchase token to backend
  → backend verifies + acknowledges
  → app calls finishTransaction
  → refresh entitlement
```

If backend verification fails, the app must not grant Pro and must show a retry/support state.

### Restore flow

`getAvailablePurchases` / active subscriptions are sent to the backend for verification, then the entitlement is refreshed. The UI must never unlock Pro without backend confirmation.

## 6. Backend architecture

The FastAPI backend owns verification and entitlement state.

### Authentication

Receipt and billing endpoints need two credentials:

```text
Authorization: Bearer <Supabase access token>   user identity
X-API-Key: <vision API key>                    service access
```

The backend derives the user from the Supabase JWT. It must not trust a user ID supplied by the client.

### Endpoints

#### `POST /api/v1/billing/google/verify`

Input:

```json
{
  "purchaseToken": "...",
  "productId": "prettycash_pro_monthly",
  "packageName": "com.mohamedahshik.prettycash"
}
```

Behavior:

1. Authenticate the Supabase user.
2. Call Google Play `purchases.subscriptionsv2.get`.
3. Validate package name, product, purchase state, and expiry.
4. Acknowledge the purchase through the Google Play Developer API if not already acknowledged.
5. Upsert the subscription row.
6. Return the current entitlement and quota status.

#### `GET /api/v1/billing/entitlement`

Returns:

- `isPro`
- `status`
- `productId`
- `trialEnd`
- `currentPeriodEnd`
- `scansUsed`
- `scanLimit`
- `scanResetAt`
- `canScan`

#### `POST /api/v1/billing/google/rtdn`

Pub/Sub push endpoint for Real-Time Developer Notifications.

Behavior:

1. Authenticate the Pub/Sub request.
2. Decode the base64 message.
3. Extract `packageName`, `subscriptionId`, `purchaseToken`, and notification type.
4. Re-fetch the authoritative subscription from Google.
5. Update the subscription row and entitlement.
6. Return 204.

It must be idempotent and safe to retry.

### Google Play API

- Use a service account with Play Developer API access.
- Required API: Google Play Android Developer API.
- Verification: `purchases.subscriptionsv2.get`.
- Acknowledge: `purchases.subscriptions.acknowledge`.
- Config:
  - `GOOGLE_PLAY_PACKAGE_NAME=com.mohamedahshik.prettycash`
  - `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (secret) or a mounted JSON path.

## 7. Supabase schema

### `subscriptions`

- `id uuid`
- `user_id uuid`
- `provider text default 'google'`
- `product_id text`
- `purchase_token text unique`
- `status text`
- `is_trial boolean`
- `auto_renewing boolean`
- `current_period_end timestamptz`
- `trial_end timestamptz`
- `last_verified_at timestamptz`
- `raw_response jsonb`
- `created_at`, `updated_at`

One active subscription per user in the PrettyCash Pro group.

### `scan_usage`

- `id uuid`
- `user_id uuid`
- `usage_date date`
- `scans_used integer`
- `created_at`, `updated_at`
- unique `(user_id, usage_date)`

The backend increments usage atomically and derives:
- free monthly usage = sum for the local month,
- trial daily usage = row for the local day.

### RLS

- Users may read their own subscription/usage.
- Only the service role may write verification/RTDN data.
- Receipt quota checks happen server-side.

## 8. Receipt endpoint changes

`POST /api/v1/analyze-receipt`:

- Requires Supabase JWT + API key.
- Checks `canScan` before enqueueing.
- Increments usage only when the job is created.
- Returns a structured `receipt_scan_limit` error with:
  - reason (`free_monthly_limit` or `trial_daily_limit`)
  - `resetAt`
  - `paywall` flag
- The client opens the paywall for free limit errors and a “resume tomorrow” state for trial limits.

## 9. Errors and edge cases

- Google API unavailable → keep existing entitlement, return retryable error.
- Purchase acknowledgement fails → do not grant Pro until verified; retry.
- Duplicate purchase token → idempotent upsert.
- RTDN arrives before verify → fetch authoritative state and upsert.
- Subscription expires → entitlement refresh removes Pro.
- Grace period/on-hold → follow Google status and display billing recovery.
- User cancels during trial → access until trial end or cancellation semantics from Google.
- User restores on a new device → backend verification grants entitlement.
- Product price unavailable → paywall shows a retry state, not a fake price.
- Trial daily cap → no purchase prompt; show resume time.

## 10. Google Play Console checklist

The developer account exists. These are the remaining external steps:

1. **Merchant/payments profile**
   - Complete bank account, tax, and identity verification.
2. **Create the app**
   - Package: `com.mohamedahshik.prettycash`.
   - Upload an internal-testing Android build before product testing.
3. **Create subscription group**
   - Name: PrettyCash Pro.
   - Create `prettycash_pro_monthly` and `prettycash_pro_annual`.
   - Add a 7-day free trial offer to both.
   - Set prices, activate base plans, and confirm Google Play shows **Active**.
4. **License testing**
   - Add tester Gmail accounts under Setup → License testing.
   - Set license response to `RESPOND_NORMALLY`.
5. **Service account**
   - Enable Google Play Android Developer API in Google Cloud.
   - Create a service account and JSON key.
   - Grant it Play Console access with financial/order permissions.
6. **Pub/Sub + RTDN**
   - Create a Pub/Sub topic.
   - Grant `google-play-developer-notifications@system.gserviceaccount.com` publisher permission.
   - Paste the topic into Play Console → Monetization setup.
7. **Legal URLs**
   - Publish Privacy Policy and Terms of Service on public HTTPS URLs.
8. **Backend**
   - Deploy the FastAPI backend at a public HTTPS URL.
   - Set the service-account, Supabase, and Pub/Sub webhook secrets.
9. **Testing**
   - Internal testing track → opt-in → install.
   - Use a license tester; verify “Test Card, Always Approves”.
   - Confirm trial renewal simulation and RTDN updates.

## 11. Testing strategy

### Backend

- Google API verification with mocked responses.
- Purchase acknowledgement is idempotent.
- RTDN parsing and status updates.
- Free monthly quota and trial daily quota.
- Timezone month/day boundaries.
- Duplicate token handling.
- Subscription expiration and grace-period transitions.

### App

- Product fetch and localized price rendering.
- Paywall compliance copy.
- Purchase success → backend verification → entitlement refresh.
- Cancel/error states.
- Restore Purchases.
- Free quota exhaustion opens paywall.
- Trial daily cap does not open paywall.
- Receipt analysis sends JWT and API key.

### Sandbox

- Google Play internal testing with license testers.
- Test card purchase.
- Verify server database and entitlement.
- Verify RTDN renew/cancel/grace events.
- Verify 5-minute test renewal behavior.

## 12. Rollout

1. Merge schema and backend verification/RTDN.
2. Deploy backend with secrets.
3. Create and activate Play Console products.
4. Build a new EAS development client containing `expo-iap`.
5. Test internally with license testers.
6. Submit app for production review only after the paywall, legal links, and backend HTTPS are ready.

## 13. Out of scope for this phase

- iOS StoreKit subscriptions.
- Consumable products.
- Promo codes and offer redemption.
- Upgrades/downgrades between plans.
- Refund automation.
- Revenue analytics beyond subscription state.

## 14. Implementation status

Implementation status: Spec only. No billing library, schema, backend endpoint, paywall, or quota enforcement has been implemented yet.
