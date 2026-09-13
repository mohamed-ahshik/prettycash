# PrettyCash — Supabase Auth & Database Design (Spec)

**Date:** 2026-09-13
**Status:** Approved for implementation
**Implementation status:** Not started

---

## 1. Overview & Objective

Replace the app's in-memory/mock data with a **Supabase** backend: OAuth sign-in (Google + Facebook), a cleanly-segregated Postgres schema enforced by **Row Level Security (RLS)**, and per-entity repository modules that the existing contexts/screens read from and write to. Receipt images are persisted in Supabase Storage.

**Dependency:** this builds on the "Add Transaction with AI Receipt Scan" feature (transactions have `categoryId`, `note`, and nested `items`; receipts are captured as base64). That feature must be merged first.

---

## 2. Architecture & Configuration

### 2.1 Dependencies
- `@supabase/supabase-js`
- `expo-secure-store` (auth token persistence)
- `expo-auth-session` + `expo-web-browser` (OAuth redirect handling)
- `react-native-url-polyfill` (URL support required by supabase-js on RN)

### 2.2 Environment
Add to `.env.example` (and `.env`, which is gitignored):
```
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

### 2.3 Client & providers
- `src/lib/supabase.ts` — single `createClient(EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, { auth: { storage: secureStoreAdapter, autoRefreshToken: true, persistSession: true, detectSessionInUrl: Platform.OS === 'web' } })`.
- `AuthProvider` (`src/context/AuthContext.tsx`) — exposes `{ session, user, loading, signInWithProvider, signOut }`. On mount it calls `supabase.auth.getSession()` to restore a persisted session.
- App gate in `App.tsx`: while `loading` show a splash; if no `session`, render `LoginScreen`; otherwise render the existing `NavigationContainer` (inside `AuthProvider` → `CategoriesProvider` → `TransactionsProvider`).

---

## 3. Database Schema (Postgres + RLS)

All tables have `id uuid primary key default gen_random_uuid()`, `user_id uuid not null references auth.users(id) on delete cascade`, `created_at timestamptz not null default now()`, and **RLS enabled**. Every policy filters on `auth.uid() = user_id`.

### 3.1 `profiles`
- `user_id uuid unique not null` (1:1 with `auth.users`)
- `name text`, `email text`, `currency text not null default 'USD ($)'`
- `notifications_enabled boolean not null default true`
- `haptics_enabled boolean not null default true`
- `member_since text`
- `seeded boolean not null default false` (whether default categories were inserted)

### 3.2 `categories`
- `name text not null`
- `type text not null check (type in ('expense','income'))`
- `icon text`, `color_bg text`, `color_fg text`, `notes text`
- `sort_order integer not null default 0`

### 3.3 `transactions`
- `name text not null`
- `date date not null`
- `time text` (display string, e.g. `9:42 AM`)
- `category_id uuid references categories(id) on delete set null`
- `type text not null check (type in ('expense','income'))`
- `amount numeric(12,2) not null`
- `icon text`, `note text`
- `receipt_path text` (storage object path)

### 3.4 `transaction_items`
- `transaction_id uuid not null references transactions(id) on delete cascade`
- `name text not null`
- `quantity numeric`
- `price numeric(12,2) not null`
- `position integer not null default 0`
- RLS policy: `exists (select 1 from transactions t where t.id = transaction_id and t.user_id = auth.uid())`

### 3.5 `recurring_items`
- `name text not null`
- `type text not null check (type in ('expense','income'))`
- `amount numeric(12,2) not null`
- `category_id uuid references categories(id) on delete set null`
- `icon text`, `color_bg text`, `color_fg text`
- `day_of_month integer check (day_of_month between 1 and 31)`
- `active boolean not null default true`

### 3.6 Storage
- Private bucket `receipts`. Objects at path `{user_id}/{transaction_id}`.
- Storage policies: users can read/write only objects whose first path segment equals their `auth.uid()`.
- The app stores `receipt_path` on the transaction and displays the image via a short-lived signed URL (`createSignedUrl`).

### 3.7 Schema notes
- IDs are UUIDs everywhere (replaces the current string ids like `exp-food`, `rec-rent`).
- Recurring `category` (a name string today) is reconciled to `category_id`.
- The seed transaction/category mock data (`seedTransactions`, `DEFAULT_*_CATEGORIES`, `INITIAL_RECURRING_ITEMS`, `INITIAL_PROFILE`) is superseded by the DB.

---

## 4. Auth Flow (Google + Facebook)

- `LoginScreen` with two buttons: "Continue with Google", "Continue with Facebook".
- `signInWithProvider(provider)`:
  1. `redirectTo = Linking.createURL('auth/callback')`.
  2. `supabase.auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: true } })`.
  3. Open `data.url` via `WebBrowser.openAuthSessionAsync(data.url, redirectTo)` (native) or browser redirect (web).
  4. On success, `supabase.auth.setSession(...)` (or the redirect listener recovers the session); `onAuthStateChange` updates the `AuthProvider`.
- **Profile sync:** after sign-in, upsert `profiles` with the provider's `name`/`email` (via `user.user_metadata`). `currency`/flags keep defaults.
- **Sign out:** `supabase.auth.signOut()`; `AuthProvider` clears state; app returns to `LoginScreen`.

---

## 5. Data Layer & Seeding

### 5.1 Repositories (Approach A)
- `src/data/profileRepo.ts`, `categoriesRepo.ts`, `transactionsRepo.ts`, `recurringRepo.ts`, `storageRepo.ts`.
- Each owns its queries and maps DB rows ↔ app types (snake_case ↔ camelCase, UUID ids ↔ `CategoryItem`/`Transaction`/`RecurringItem`/`UserProfile`).
- `transactionsRepo` fetches transactions **and** their `transaction_items` (join + group), and `addTransaction` inserts the transaction row, then its items, then stores the receipt.

### 5.2 Context/screen refactors
- `CategoriesContext`: loads categories on auth; `addCategory` inserts + optimistic update.
- `TransactionsContext`: loads transactions (+items) on auth; `addTransaction` inserts + uploads receipt (`storageRepo.upload`) then sets `receipt_path`.
- `ProfileScreen`: loads `UserProfile` + `RecurringItem[]` from repos; toggles/adds persist.

### 5.3 Seeding default categories
- On first sign-in (`profiles.seeded = false`): insert the default expense/income categories (Food, Shopping, Drinks, Travel, Fun, Bills + Salary, Freelance, Investments, Gifts), then set `seeded = true`.
- Seeding is triggered client-side after profile upsert, guarded by the `seeded` flag so a user who deletes all categories is not re-seeded.

---

## 6. Error Handling, Loading, Testing

- Each context exposes `loading` and `error`; a top-level "Loading your data…" state covers the initial fetch; mutations are explicit and awaited with inline error surfaces (no silent data loss).
- Network failures on mutations surface an error and leave the local optimistic state intact for retry.
- **Testing:** unit-test repository row-mapping and the seeding logic with a mocked Supabase client; verify the SQL schema/RLS manually in the Supabase dashboard (or via a schema smoke test).

---

## 7. Out of Scope

- The vision/AI receipt-analysis backend (separate Python repo) and its API key handling.
- Realtime subscriptions (fetch-on-login + explicit CRUD only).
- Offline persistence beyond the auth session token.
