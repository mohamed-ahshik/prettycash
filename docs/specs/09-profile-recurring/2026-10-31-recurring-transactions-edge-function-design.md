# Recurring Transactions, Timezones, and Month-End Push Confirmation

Implementation status: Implemented; database migration applied, Edge Function deployed, hourly cron scheduled; FCM V1 credentials configured; Android EAS build with google-services finished; device verification pending

## 1. Goal

Automatically post recurring transactions on their scheduled local date, even when the app is closed. When a schedule is set for a day that does not exist in the current month (for example, the 31st in April), do not guess. Send a push notification and ask the user whether to post the transaction on the last valid day of that month or skip it.

## 2. Scope

In scope:

- Store and sync each user's IANA timezone.
- Add a Supabase Edge Function that processes active recurring items.
- Post normal recurring transactions automatically.
- Create a pending confirmation for ambiguous month-end dates.
- Send one Expo push notification for each pending ambiguous occurrence.
- Let the user confirm or skip from the app.
- Link recurring items to their main category through `category_id`.
- Preserve the existing recurring item category snapshot as a fallback.

Out of scope:

- Reminders for normal, non-ambiguous recurring dates.
- Editing a recurring item from the notification.
- Direct action buttons inside the push notification.
- Backfilling every month missed while the Edge Function was unavailable.

## 3. Definitions

- **Local date:** the calendar date in the user's `profiles.timezone`.
- **Normal due date:** the configured `day_of_month` exists in the current local month.
- **Ambiguous due date:** the configured `day_of_month` is greater than the number of days in the current local month.
- **Valid fallback day:** the last day of the current local month:
  - April, June, September, November → 30
  - February → 28, or 29 in a leap year
  - Months with 31 days → 31
- **Current-month rule:** the function only considers the occurrence in the user's current local month. It never backfills previous months.

## 4. Timezone Handling

The server cannot know a user's location from IP reliably. Timezone is stored explicitly.

### Schema

Add to `profiles`:

- `timezone text not null default 'UTC'`
- `timezone_updated_at timestamptz`

`timezone` stores an IANA identifier such as `Asia/Singapore` or `America/New_York`.

### Client sync

- Read the device timezone with `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- Validate that it is a non-empty IANA string.
- Send it to a dedicated repository function that updates only `timezone` and `timezone_updated_at`.
- Sync after authentication succeeds.
- Sync again when the app returns to the foreground.
- Fall back to `UTC` when the device timezone is unavailable or invalid.

### Server use

- The Edge Function reads the user's stored timezone.
- Use Deno's `Intl.DateTimeFormat` with the stored IANA timezone to compute local year, month, and day.
- Invalid timezone values fall back to `UTC`.
- The cron runs hourly, so every timezone and DST transition is covered.

### Date written to the transaction

`transactions.date` is the scheduled local date, not the date the function ran.

Example:

- Due date: 5th
- User timezone: `Asia/Singapore`
- Function runs: 2026-11-05 at 00:xx Singapore time
- Stored transaction date: `2026-11-05`

## 5. Recurring Data Changes

### `recurring_items`

Add:

- `category_id uuid references categories(id) on delete set null`

Keep:

- `category_name`
- `icon`
- `color_bg`
- `color_fg`

The ID is the live link. The snapshot fields remain the display fallback if the category is deleted.

Backfill existing rows by matching `category_name` to `categories.name` for the same user and type. If no unambiguous match exists, leave `category_id` null.

The Add Recurring form saves the selected category ID.

### `transactions`

No new columns are required if occurrence identity is stored in the dedicated ledger below. Transactions created by recurring processing are linked through `recurring_occurrences.transaction_id`.

### `recurring_occurrences`

Create:

- `id uuid primary key`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `recurring_item_id uuid not null references recurring_items(id) on delete cascade`
- `occurrence_date date not null`
- `status text not null check (status in ('pending', 'posted', 'skipped'))`
- `transaction_id uuid references transactions(id) on delete set null`
- `notification_sent_at timestamptz`
- `resolved_at timestamptz`
- `created_at timestamptz not null default now()`

Constraints:

- Unique `(recurring_item_id, occurrence_date)`.
- Index on `(user_id, status, occurrence_date)`.

This ledger prevents duplicate transactions and prevents re-posting an occurrence after a user deletes its transaction.

### `push_tokens`

Create:

- `id uuid primary key`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `expo_push_token text not null`
- `platform text not null check (platform in ('ios', 'android'))`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraint:

- Unique `(expo_push_token)`.

Enable RLS. Users may manage only their own tokens.

## 6. Recurring Processing Rules

The Edge Function runs hourly.

For each active recurring item:

1. Compute the user's local date from `profiles.timezone`.
2. Compute the number of days in the current local month.
3. Compute the current month's due date:
   - If `day_of_month <= daysInMonth`, due date is that day.
   - If `day_of_month > daysInMonth`, due date is the last day of the month.
4. Ignore the item if its local creation date is after the current month's due date.
5. Ignore inactive items.

### Normal due date

When `day_of_month <= daysInMonth` and the local date is on or after the due date:

- Create a transaction dated the due date.
- No push notification is sent.
- Use the unique occurrence ledger to prevent duplicates.
- If the Edge Function runs late within the same month, it may still create the current month's due transaction.
- Do not create transactions for previous months.

### Ambiguous due date

When `day_of_month > daysInMonth`:

- Do not create the transaction automatically.
- On the last local day of the month, at or after 09:00 local time, create one `pending` occurrence if none exists.
- Send one push notification for that occurrence.
- Do not send the notification again after `notification_sent_at` is set.
- If the user never responds, the occurrence remains pending and no transaction is posted.

The app decision is:

- **Add on <last day>** → create a transaction dated the last valid day; mark the occurrence `posted`.
- **Skip this month** → mark the occurrence `skipped`; do not create a transaction.

Example notification:

> **Recurring date needs confirmation**
> April has 30 days. Add Rent on April 30 or skip this month.

For February, the notification says February 28 or February 29, whichever is the last valid day. The user is not choosing among 28/29/30 arbitrarily; the only fallback is the last valid day of that month.

### Paused and deleted items

- Pausing prevents future occurrences.
- An occurrence already pending remains resolvable unless the recurring item is deleted.
- Deleting a recurring item cascades its occurrences; posted transactions remain in the ledger with no recurring link.

## 7. Edge Function

Create `supabase/functions/process-recurring/index.ts`.

Responsibilities:

- Authenticate the cron request with a secret header.
- Use the service-role Supabase client.
- Fetch active recurring items joined with profile timezones.
- Compute local date, month length, and due date.
- For normal due dates, call an atomic SQL RPC that inserts the occurrence and transaction.
- For ambiguous due dates, call an atomic SQL RPC that creates the pending occurrence, then send the push notification.
- Record `notification_sent_at` after a successful push request.
- Delete invalid Expo push tokens when Expo rejects them.
- Return counts for posted, pending, skipped, and failed items.

The function must be idempotent. Multiple hourly runs, retries, and cron overlap must not duplicate a transaction or notification.

## 8. SQL RPCs

Create server-side functions rather than performing multi-step writes across separate requests:

### `post_recurring_occurrence`

Inputs:

- recurring item ID
- occurrence date

Behavior:

- Insert the occurrence with `status = 'posted'` if it does not exist.
- Insert the transaction dated `occurrence_date`.
- Link the transaction to the occurrence.
- Return the transaction ID.
- If the occurrence already exists, return its existing transaction ID or null without creating a duplicate.

### `create_pending_recurring_occurrence`

Inputs:

- recurring item ID
- occurrence date

Behavior:

- Insert a pending occurrence if none exists.
- Return the occurrence ID and whether it was newly inserted.
- Do not create a transaction.

### `resolve_recurring_occurrence`

Inputs:

- occurrence ID
- decision: `post` or `skip`

Behavior:

- Verify the occurrence belongs to `auth.uid()`.
- Only allow resolution of a pending occurrence.
- For `post`, create the transaction dated `occurrence_date` and link it.
- For `skip`, do not create a transaction.
- Set `resolved_at`.
- Be idempotent: resolving the same occurrence twice must not create two transactions.

## 9. Push Notifications

### Client setup

Add `expo-notifications` and its Expo config plugin. A new EAS development/production build is required.

After login:

1. Request notification permission.
2. Obtain the Expo push token using the EAS project ID.
3. Upsert the token into `push_tokens`.
4. On sign-out, remove the token for the current device.

If permission is denied, the pending occurrence still appears in the app.

### Notification payload

- Title: `Recurring date needs confirmation`
- Body: `<Month> has <days> days. Add <item name> on <Month last-day> or skip this month.`
- Data: `{ type: 'recurring_occurrence', occurrenceId }`

### App response

- Tapping the notification opens the app.
- A global `PendingRecurringProvider` loads pending occurrences after authentication and on foreground.
- It shows a modal above navigation.
- If multiple pending occurrences exist, resolve them one at a time.
- The modal displays the item, amount, month, and last valid day.
- Buttons: **Add on <date>** and **Skip this month**.
- After resolution, refresh transactions.

### Edge function sending

- Send through the Expo Push API.
- Send to every registered token for the user.
- Remove invalid tokens when Expo responds with `DeviceNotRegistered`.
- Mark `notification_sent_at` only after the push request succeeds.

## 10. Client Refresh

Add `refreshTransactions` to `TransactionsContext`.

Call it when:

- the app returns to the foreground,
- a pending occurrence is resolved,
- the recurring processing is known to have completed.

This ensures server-created transactions are visible without restarting the app.

## 11. User Interface

Add a pending-confirmation modal that is not tied to the Profile screen, because the notification can be tapped from anywhere.

The modal must:

- be dismissible without resolving, leaving the occurrence pending,
- show the correct local fallback date,
- show the recurring item name and amount,
- disable actions while a request is in flight,
- handle duplicate resolution gracefully.

The Recurring modal may also display a small pending badge for affected items.

## 12. Failure Handling

- Invalid timezone → UTC.
- Missing profile timezone → UTC.
- Missing push token → pending occurrence remains available in-app.
- Push API failure → occurrence remains pending; retry logic may resend only if `notification_sent_at` is null.
- Transaction insert failure → occurrence must not be marked posted.
- Duplicate function execution → idempotent RPCs prevent duplicates.
- Deleted category → recurring item falls back to its stored snapshot.
- Deleted recurring item → pending occurrences cascade; posted transactions remain.

## 13. Testing

### Edge Function date logic

- Normal due date in a 31-day month.
- Day 31 in a 30-day month → last day is 30.
- Day 31 in February → 28.
- Day 31 in leap-year February → 29.
- Day 30 in February → 28/29.
- Local midnight around UTC offset boundaries.
- DST transition days.
- Missing/invalid timezone → UTC.
- Current-month-only behavior; no previous-month backfill.

### Database

- Unique occurrence constraint.
- `post_recurring_occurrence` is idempotent.
- `resolve_recurring_occurrence` is idempotent.
- User cannot resolve another user's occurrence.
- Deleting a recurring item preserves posted transactions.

### Client

- Timezone sync on login and foreground.
- Push token registration and cleanup.
- Pending occurrence modal appears after auth.
- Add on fallback date creates a transaction dated the fallback date.
- Skip creates no transaction.
- Transactions refresh after resolution.

### Manual

- Set a recurring item to day 31.
- Test in a 31-day month: transaction posts automatically.
- Test in a 30-day month: push arrives on the last day; add creates the 30th transaction; skip creates none.
- Test February in a non-leap year and leap year.
- Test Android and iOS push delivery.

## 14. Rollout

1. Apply schema migration.
2. Backfill `category_id` for existing recurring items.
3. Deploy the Edge Function and configure its secrets.
4. Create the hourly Supabase Cron job.
5. Ship the app update with timezone sync and push registration.
6. Configure FCM V1 for Android and APNs for iOS push delivery.
7. Build a new EAS app containing `expo-notifications`.

Behavior after rollout:

- Existing active recurring items begin with their current month's occurrence.
- Previous months are not backfilled.
- Users who have not launched the updated app use the `UTC` timezone fallback until their first sync.

## 15. Implementation status

Implementation status: Implemented. Schema migration, Edge Function, hourly cron job, push registration, pending-occurrence modal, and transaction refresh are in place. Android FCM V1 credentials are configured. The Android EAS build with `google-services.json` is in progress. iOS APNs credentials and device verification are still pending.
