# 03 — Data Platform

Implementation status: Implemented

## Purpose

Own the Supabase project, schema, RLS policies, persistence repositories, row mapping, storage, and the context layer that exposes server data to the UI.

## Responsibilities

- Create and migrate all Postgres tables and policies.
- Map SQL rows into typed frontend models.
- Handle CRUD for profiles, categories, transactions, line items, recurring items, and recurring occurrences.
- Store receipt images in Supabase Storage.
- Seed default categories and initial user data.
- Keep server state synchronized with feature contexts.

## Main files

- `src/lib/supabase.ts` — Supabase client, PKCE, platform storage.
- `src/data/repositories/` — profiles, categories, transactions, recurring items, occurrences, storage.
- `src/data/repositories/mappers.ts` — row → domain model mapping.
- `src/data/seed.ts` — default category seeding.
- `src/data/categoriesData.ts` — preset colors and icons.
- `src/context/CategoriesContext.tsx` — category state and CRUD.
- `src/context/TransactionsContext.tsx` — transaction state, CRUD, refresh.
- `supabase/migrations/` — schema history.
- `supabase/functions/process-recurring/` — server-side recurring processing.

## Schema domains

### Identity and profile

- `profiles` — user settings, timezone, currency, theme, notifications, seeding flag.

### Finance

- `categories` — expense/income categories, colors, icons, uncategorized sentinel.
- `transactions` — amount, type, date, category, note, receipt metadata.
- `transaction_items` — optional line items for receipt transactions.

### Recurring

- `recurring_items` — schedule definition, amount, category snapshot/link, day of month.
- `recurring_occurrences` — idempotent posted/pending/skipped occurrence ledger.

### Device and storage

- `push_tokens` — Expo push tokens per user/device.
- `receipts` storage bucket — private receipt images scoped by user.

## Data flow

```text
Screen / provider
  → repository function
  → supabase-js
  → Postgres / Storage
  → row mapper
  → typed domain object
  → React context state
  → screen render
```

## RLS and security

Every user-owned table has a policy equivalent to:

```sql
auth.uid() = user_id
```

The client never uses a service-role key. Edge Functions use the service role only inside Supabase. `receipts` objects are scoped by `(storage.foldername(name))[1] = auth.uid()::text`.

## Migration history

- Initial schema and RLS.
- Receipt data columns.
- Theme preference.
- Auto-categorization and uncategorized category.
- Receipt job request idempotency.
- Recurring timezone/category/occurrence/push-token schema.
- Recurring SQL RPCs.

## Error handling

Repositories throw Supabase errors; contexts catch and expose `error` states. Feature screens render empty/error/retry states rather than silently failing.

## Boundaries

- The data platform stores; feature modules decide semantics.
- Recurring scheduling policy lives in module 09, not in generic repositories.
- Receipt AI orchestration lives in module 06; the data platform stores its results.

## Related documentation

- [[2026-09-13-supabase-auth-database-design]]
- [[2026-09-16-home-insights-db-data-design]]
- [[2026-09-13-supabase-auth-database]]
- [[2026-09-16-home-insights-db-data]]
- Cross-module: [[2026-10-31-recurring-transactions-edge-function-design]]
- [[architecture-index|Back to architecture index]]
