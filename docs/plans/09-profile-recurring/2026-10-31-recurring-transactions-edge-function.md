# Recurring Transactions, Timezones, and Push Confirmation Implementation Plan

Implementation status: Implemented; FCM V1 configured; Android EAS build with google-services finished; device verification pending

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Post normal recurring transactions automatically from a Supabase Edge Function and prompt the user, via push notification, when a month has no configured day.

**Architecture:** A stored IANA timezone per profile drives local-date calculations. An hourly Edge Function posts normal occurrences through an atomic SQL RPC. Ambiguous month-end occurrences are recorded as pending and trigger an Expo push notification. The app resolves pending occurrences and refreshes transactions.

**Tech Stack:** Supabase Postgres/Edge Functions/Cron, Expo SDK 58, `expo-notifications`, React Native, Jest.

## Global Constraints

- Option 2 only: server-side processing; no client catch-up.
- Only the current local month is processed; no prior-month backfill.
- Day 31 (or any day greater than the month length) never posts silently.
- The fallback date is always the last valid day of that local month.
- All transaction dates are local scheduled dates, not execution dates.
- Duplicate protection is required for transactions and notifications.
- Expo Go cannot test push notifications; use the EAS development build.

---

### Task 1: Database schema

**Files:**
- Create: `supabase/migrations/20261031000000_recurring_schedule.sql`

- [x] Add `profiles.timezone` and `profiles.timezone_updated_at`.
- [x] Add `recurring_items.category_id`.
- [x] Backfill `category_id` by unique user/type/name match.
- [x] Create `recurring_occurrences` with unique `(recurring_item_id, occurrence_date)`.
- [x] Create `push_tokens` with unique `expo_push_token`.
- [x] Enable RLS and ownership policies.

### Task 2: SQL RPCs

**Files:**
- Create: `supabase/migrations/20261031000100_recurring_rpcs.sql`

- [x] Create `post_recurring_occurrence`.
- [x] Create `create_pending_recurring_occurrence`.
- [x] Create `resolve_recurring_occurrence`.
- [x] Restrict service-role RPC execution.
- [x] Add ownership checks for client resolution.

### Task 3: Pure recurrence logic

**Files:**
- Create: `supabase/functions/_shared/recurrence.ts`
- Create: `supabase/functions/__tests__/recurrence.test.ts`

- [x] Implement local date parts from IANA timezone.
- [x] Implement days-in-month and leap-year logic.
- [x] Implement due-date clamping.
- [x] Implement local-hour checks for the 09:00 notification window.
- [x] Test 31st in 30-day months, February, leap years, DST boundaries, and invalid timezones.

### Task 4: Edge Function

**Files:**
- Create: `supabase/functions/process-recurring/index.ts`

- [x] Verify the cron secret.
- [x] Process active recurring items with profile timezones.
- [x] Auto-post normal due occurrences through RPC.
- [x] Create pending occurrences and send pushes for ambiguous dates.
- [x] Send through Expo Push API and remove invalid tokens.
- [x] Make repeated runs idempotent.

### Task 5: Client timezone sync

**Files:**
- Create: `src/lib/timezone.ts`
- Modify: `src/data/repositories/profileRepo.ts`
- Modify: `App.tsx`

- [x] Read the device IANA timezone.
- [x] Validate it.
- [x] Update only timezone columns.
- [x] Sync after login and on foreground.

### Task 6: Push registration

**Files:**
- Install: `expo-notifications`
- Create: `src/lib/notifications.ts`
- Modify: `app.json`
- Modify: `src/context/AuthContext.tsx`

- [x] Add the Expo config plugin.
- [x] Request permission and register the Expo push token.
- [x] Upsert the token into `push_tokens`.
- [x] Remove the device token on sign-out.

### Task 7: Category ID plumbing

**Files:**
- Modify: `src/types/profile.ts`
- Modify: `src/data/repositories/mappers.ts`
- Modify: `src/data/repositories/recurringRepo.ts`
- Modify: `src/components/AddRecurringModal.tsx`

- [x] Add `categoryId` to `RecurringItem`.
- [x] Map and persist `category_id`.
- [x] Save the selected category ID in the form.

### Task 8: Pending confirmation flow

**Files:**
- Create: `src/data/repositories/recurringOccurrencesRepo.ts`
- Create: `src/context/PendingRecurringContext.tsx`
- Create: `src/components/RecurringConfirmationModal.tsx`
- Modify: `App.tsx`
- Modify: `src/context/TransactionsContext.tsx`

- [x] Fetch pending occurrences for the authenticated user.
- [x] Show one pending prompt at a time.
- [x] Add on fallback date / skip this month.
- [x] Refresh pending occurrences and transactions.
- [x] Handle notification taps and foreground refresh.

### Task 9: Verification

- [x] Run `npm test` (180 passing).
- [x] Run `npx tsc --noEmit`.
- [x] Export the web bundle.
- [x] Build a new EAS development client containing `expo-notifications` (b29c9508-287b-48f5-b30f-2e589baf674a).
- [x] Finish the Android build with `google-services.json` (08b41a3b-ab09-40e1-9be5-379ad2ec8a98).
- [ ] Install the APK, register a push token, and verify delivery.
- [ ] Install the new APK and verify pending confirmation + transaction refresh on device.
- [x] Configure FCM V1 (Android) push credentials.
- [ ] Configure APNs (iOS) push credentials.
- [x] Deploy the Edge Function and configure the hourly cron.
- [x] Manually invoke the deployed function (`posted: 1, failed: 0`).

## Known deployment dependencies

- The Edge Function needs `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET`.
- The cron job needs the deployed function URL and the same secret.
- Push notifications need the EAS project ID, FCM V1 credentials for Android, APNs credentials for iOS, and a physical device.
