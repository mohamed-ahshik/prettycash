# 09 — Profile and Recurring

Implementation status: Implemented; Android push configured, iOS APNs pending

## Purpose

Own the profile/settings surface and recurring transaction lifecycle, including timezone-aware server processing and month-end push confirmations.

## Responsibilities

- Edit/show profile details and membership information.
- Manage currency, notifications, haptics, theme preference, and auto-categorization.
- List, create, pause, resume, and delete recurring items.
- Save recurring category identity and schedule day.
- Process recurring items hourly on the server.
- Compute local due dates from stored IANA timezones.
- Ask the user before using the last valid day of a short month.
- Register push tokens, send Expo pushes, and resolve pending occurrences in-app.
- Refresh transactions after server-side posting.

## Main files

- `src/screens/ProfileScreen.tsx` — profile/settings UI and recurring entry.
- `src/components/RecurringModal.tsx` — recurring list/toggles/delete.
- `src/components/AddRecurringModal.tsx` — schedule form using live categories.
- `src/context/PendingRecurringContext.tsx` — pending occurrence queue and notification response handling.
- `src/components/RecurringConfirmationModal.tsx` — month-end add/skip decision.
- `src/context/TransactionsContext.tsx` — `refreshTransactions`.
- `src/data/repositories/recurringRepo.ts` — recurring item CRUD.
- `src/data/repositories/recurringOccurrencesRepo.ts` — pending occurrence listing/resolution.
- `src/data/repositories/profileRepo.ts` — profile persistence and timezone update.
- `src/lib/timezone.ts` — device timezone validation.
- `src/lib/notifications.ts` — Expo push registration/handler/tap data.
- `supabase/functions/process-recurring/index.ts` — hourly processor.
- `supabase/functions/_shared/recurrence.ts` — pure local-date/month-end logic.
- Migrations: recurring schedule, occurrence ledger, push tokens, RPCs.

## Schedule model

```text
RecurringItem
  name, type, amount
  category_id + category snapshot
  day_of_month (1–31)
  active

RecurringOccurrence
  recurring_item_id + occurrence_date (unique)
  status: pending | posted | skipped
  transaction_id
  notification_sent_at
  resolved_at
```

## Server processing

```text
Supabase Cron (hourly)
  → process-recurring Edge Function
  → read active items + profile timezone
  → compute local year/month/day
  → clamp day to last day of month
  → normal due date: post_recurring_occurrence RPC
  → ambiguous due date: create_pending_recurring_occurrence + Expo push
```

The function processes only the current local month and never backfills prior months.

## Month-end decision flow

```text
Last local day, at/after 09:00
  → pending occurrence created
  → push: “Month has N days. Add item on Month N or skip this month.”
  → user taps notification
  → app opens PendingRecurringProvider
  → Add on last day → transaction dated last day
  → Skip this month → occurrence marked skipped
```

## Timezone model

- App reads `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- `profiles.timezone` stores the IANA identifier.
- Edge Function uses the same identifier to compute local dates.
- Missing/invalid timezone falls back to UTC.
- The device clock is not trusted for scheduling; server time + stored timezone is authoritative.

## Push model

- App registers an Expo push token after login and saves it in `push_tokens`.
- Edge Function sends to every token for the owning user.
- Invalid `DeviceNotRegistered` tokens are removed.
- Android uses FCM V1 credentials in EAS; iOS needs APNs credentials.
- If push permission is denied, pending confirmations still appear when the app opens.

## Boundaries

- Profile owns user preferences, not transaction analytics.
- Recurring processing owns server-created transactions; transaction display remains in module 05.
- Category CRUD remains in module 08; recurring stores current category identity.

## Related documentation

- [[2026-09-12-profile-and-recurring-design]]
- [[2026-10-31-recurring-transactions-edge-function-design]]
- [[2026-09-12-profile-and-recurring]]
- [[2026-10-31-recurring-transactions-edge-function]]
- Cross-module: [[2026-09-13-supabase-auth-database-design]]
- [[architecture-index|Back to architecture index]]
