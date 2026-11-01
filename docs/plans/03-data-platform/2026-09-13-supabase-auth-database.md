# Supabase Auth & Database Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Supabase OAuth sign-in (Google + Facebook) and migrate all app data (profile, categories, transactions + line items, recurring items) from in-memory mock state to a Supabase Postgres database with Row Level Security, plus receipt image storage.

**Architecture:** A single Supabase client with an AsyncStorage-backed auth adapter; an `AuthProvider` gates the app behind a `LoginScreen`; per-entity repository modules own queries + row↔type mapping; existing contexts/screens call repositories instead of mock `useState` data. RLS scopes every row to `auth.uid()`.

**Tech Stack:** `@supabase/supabase-js`, `@react-native-async-storage/async-storage`, `expo-auth-session`, `expo-web-browser`, `react-native-url-polyfill`, `jest-expo`.

## Global Constraints

- Expo SDK `~57.0.21`; consult https://docs.expo.dev/versions/v57.0.0/ before writing Expo code; use `npx expo install` for Expo packages.
- No code comments in source. Use `boxShadow` (not `shadow*`), `style.pointerEvents` (not the prop).
- Env vars: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (added to `.env.example`; `.env` is gitignored).
- The anon key is safe to expose (RLS protects data); NEVER put the Supabase `service_role` key or provider secrets in the app.
- IDs are UUIDs in the DB (app string ids like `exp-food` are retired).
- `npx tsc --noEmit` and `npm test` must pass after each task.
- Auth storage uses AsyncStorage (the official Supabase Expo pattern, works on web + native). This is a deliberate refinement of the spec's "SecureStore" note — SecureStore is native-only; note it, do not use it now.

---

### Task 1: Dependencies + env config

**Files:**
- Modify: `package.json`, `.env.example`
- Modify: `index.ts`

- [ ] **Step 1: Install dependencies**

Run:
```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage expo-auth-session expo-web-browser
npm install react-native-url-polyfill
```

- [ ] **Step 2: Add env vars to `.env.example`**

Append:
```
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

- [ ] **Step 3: Add a URL scheme for native OAuth deep links**

In `app.json`, add a top-level `"scheme"` to the `expo` object:
```json
"scheme": "prettycash"
```
(Required by `expo-auth-session`'s `makeRedirectUri()` on iOS/Android; harmless on web.)

- [ ] **Step 4: Import the URL polyfill at the app entry**

In `index.ts`, add as the first line (before the `App` import):
```ts
import 'react-native-url-polyfill/auto';
```

- [ ] **Step 5: Verify compile**

Run: `npx tsc --noEmit`
Expected: success.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .env.example index.ts app.json
git commit -m "chore: add supabase deps, env config, and app scheme"
```

---

### Task 2: SQL schema, RLS, and storage

**Files:**
- Create: `supabase/migrations/20260913000000_init.sql`

**Interfaces:**
- Produces: the complete Postgres schema (tables, RLS policies, storage bucket + policies) runnable in the Supabase SQL Editor.

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/20260913000000_init.sql`:

```sql
create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  name text,
  email text,
  currency text not null default 'USD ($)',
  notifications_enabled boolean not null default true,
  haptics_enabled boolean not null default true,
  member_since text,
  seeded boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('expense','income')),
  icon text,
  color_bg text,
  color_fg text,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  date date not null,
  time text,
  category_id uuid references public.categories(id) on delete set null,
  type text not null check (type in ('expense','income')),
  amount numeric(12,2) not null,
  icon text,
  note text,
  receipt_path text,
  created_at timestamptz not null default now()
);

create table public.transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  name text not null,
  quantity numeric,
  price numeric(12,2) not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.recurring_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('expense','income')),
  amount numeric(12,2) not null,
  category_name text,
  icon text,
  color_bg text,
  color_fg text,
  day_of_month integer check (day_of_month between 1 and 31),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_items enable row level security;
alter table public.recurring_items enable row level security;

create policy "own profiles" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own categories" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own transactions" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own transaction items" on public.transaction_items
  for all using (
    exists (
      select 1 from public.transactions t
      where t.id = transaction_id and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.transactions t
      where t.id = transaction_id and t.user_id = auth.uid()
    )
  );

create policy "own recurring items" on public.recurring_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public) values ('receipts', 'receipts', false)
  on conflict (id) do nothing;

create policy "own receipt read" on storage.objects
  for select using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own receipt write" on storage.objects
  for insert with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own receipt update" on storage.objects
  for update using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own receipt delete" on storage.objects
  for delete using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260913000000_init.sql
git commit -m "feat: add supabase schema, RLS policies, and receipts storage"
```

Note: this SQL is applied manually in the Supabase SQL Editor (or via `supabase db push`); there is no automated test for it. The implementer should sanity-check that `storage.foldername` is a valid function name in the target Supabase (if not, the policy becomes `(name like auth.uid()::text || '/%')`).

---

### Task 3: Supabase client + auth storage adapter

**Files:**
- Create: `src/lib/supabase.ts`
- Test: `src/lib/__tests__/supabaseStorage.test.ts`

**Interfaces:**
- Produces: `export const supabase: SupabaseClient` and `export function getSupabaseUrl(): string`.

- [ ] **Step 1: Write the failing test for the storage adapter**

Create `src/lib/__tests__/supabaseStorage.test.ts`:
```ts
import { secureStorageAdapter } from '../supabase';

describe('secureStorageAdapter', () => {
  it('round-trips a value through getItem/setItem', async () => {
    await secureStorageAdapter.setItem('k', 'v');
    await expect(secureStorageAdapter.getItem('k')).resolves.toBe('v');
    await secureStorageAdapter.removeItem('k');
    await expect(secureStorageAdapter.getItem('k')).resolves.toBeNull();
  });

  it('returns null for a missing key', async () => {
    await expect(secureStorageAdapter.getItem('missing-key-xyz')).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test supabaseStorage`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/lib/supabase.ts`**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const webStorage = {
  getItem: async (key: string) => {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  },
};

export const secureStorageAdapter = Platform.OS === 'web' ? webStorage : AsyncStorage;

export function getSupabaseUrl(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
}

export function getSupabaseAnonKey(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
}

export const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
  auth: {
    storage: secureStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test supabaseStorage`
Expected: PASS.

- [ ] **Step 5: Verify compile and commit**

Run: `npx tsc --noEmit`
```bash
git add src/lib/supabase.ts src/lib/__tests__/supabaseStorage.test.ts
git commit -m "feat: add supabase client with platform-aware auth storage"
```

---

### Task 4: AuthContext + LoginScreen

**Files:**
- Create: `src/context/AuthContext.tsx`
- Create: `src/screens/LoginScreen.tsx`

**Interfaces:**
- Consumes: `supabase` from `src/lib/supabase.ts`.
- Produces:
  - `AuthProvider` (wraps children) exposing via `useAuth()`: `{ session, user, loading, signInWithProvider(provider: 'google'|'facebook'): Promise<void>, signOut(): Promise<void> }`.

- [ ] **Step 1: Implement `src/context/AuthContext.tsx`**

```tsx
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithProvider: (provider: 'google' | 'facebook') => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signInWithProvider = async (provider: 'google' | 'facebook') => {
    if (Platform.OS === 'web') {
      const { error } = await supabase.auth.signInWithOAuth({ provider });
      if (error) throw error;
      return;
    }
    const redirectTo = makeRedirectUri();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data?.url) return;
    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (res.type === 'success') {
      const url = new URL(res.url);
      const code = url.searchParams.get('code');
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
      }
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signInWithProvider, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 2: Implement `src/screens/LoginScreen.tsx`**

A full-screen view with the PrettyCash branding and two buttons ("Continue with Google", "Continue with Facebook") that call `signInWithProvider('google' | 'facebook')`; on error, show the message inline. Style using `src/theme` (`colors.primary`, `radii.pill`, `fonts.bold`).

- [ ] **Step 3: Verify compile**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/context/AuthContext.tsx src/screens/LoginScreen.tsx
git commit -m "feat: add supabase auth context and login screen"
```

---

### Task 5: Repositories + row mapping

**Files:**
- Create: `src/data/repositories/profileRepo.ts`
- Create: `src/data/repositories/categoriesRepo.ts`
- Create: `src/data/repositories/transactionsRepo.ts`
- Create: `src/data/repositories/recurringRepo.ts`
- Create: `src/data/repositories/storageRepo.ts`
- Test: `src/data/repositories/__tests__/mappers.test.ts`

**Interfaces:**
- Consumes: `supabase`; app types `CategoryItem`, `Transaction`, `LineItem`, `RecurringItem`, `UserProfile`, `TransactionType` from `src/types`.
- Produces (repos each export these):
  - `profileRepo.getProfile(): Promise<UserProfile | null>` and `profileRepo.upsertProfile(profile: UserProfile): Promise<void>`
  - `categoriesRepo.list(): Promise<CategoryItem[]>` and `categoriesRepo.insert(input: Omit<CategoryItem,'id'>): Promise<CategoryItem>`
  - `transactionsRepo.list(): Promise<Transaction[]>` and `transactionsRepo.insert(input: Omit<Transaction,'id'>): Promise<Transaction>`
  - `recurringRepo.list(): Promise<RecurringItem[]>`, `recurringRepo.insert(input: Omit<RecurringItem,'id'|'active'>): Promise<RecurringItem>`, `recurringRepo.setActive(id: string, active: boolean): Promise<void>`
  - `storageRepo.uploadReceipt(base64: string, mimeType: string): Promise<string>` (returns the storage path) and `storageRepo.signedUrl(path: string): Promise<string>`
- Also exports `mapCategoryRow`, `mapTransactionRow`, `mapRecurringRow`, `mapProfileRow`, `mapLineItemRow` (snake_case row → app type).

- [ ] **Step 1: Write the failing tests for the mappers**

Create `src/data/repositories/__tests__/mappers.test.ts`:
```ts
import {
  mapCategoryRow, mapTransactionRow, mapRecurringRow, mapProfileRow, mapLineItemRow,
} from '../mappers';

it('maps a category row snake_case to CategoryItem', () => {
  expect(mapCategoryRow({ id: '1', name: 'Food', type: 'expense', icon: 'cart-outline', color_bg: '#DFF0EB', color_fg: '#00674F', notes: 'x' }))
    .toEqual({ id: '1', name: 'Food', type: 'expense', icon: 'cart-outline', colorBg: '#DFF0EB', colorFg: '#00674F', notes: 'x' });
});

it('maps a transaction row and its items', () => {
  const row = {
    id: 't1', name: 'Whole Foods', date: '2026-09-13', time: '9:42 AM',
    category_id: 'c1', type: 'expense', amount: 42.5, icon: 'cart-outline', note: null, receipt_path: null,
    transaction_items: [
      { id: 'i1', name: 'Milk', quantity: 2, price: 3.0 },
      { id: 'i2', name: 'Eggs', quantity: null, price: 2.5 },
    ],
  };
  expect(mapTransactionRow(row)).toEqual({
    id: 't1', name: 'Whole Foods', date: '2026-09-13', time: '9:42 AM',
    categoryId: 'c1', type: 'expense', amount: 42.5, icon: 'cart-outline', note: undefined,
    items: [
      { id: 'i1', name: 'Milk', quantity: 2, price: 3.0 },
      { id: 'i2', name: 'Eggs', quantity: undefined, price: 2.5 },
    ],
  });
});

it('maps recurring and profile rows', () => {
  expect(mapRecurringRow({ id: 'r1', name: 'Rent', type: 'expense', amount: 1200, category_name: 'Bills', icon: 'file-document-outline', color_bg: '#F3E8FF', color_fg: '#7C3AED', day_of_month: 1, active: true }))
    .toEqual({ id: 'r1', name: 'Rent', type: 'expense', amount: 1200, category: 'Bills', icon: 'file-document-outline', colorBg: '#F3E8FF', colorFg: '#7C3AED', dayOfMonth: 1, active: true });
  expect(mapProfileRow({ name: 'Maya', email: 'm@x.co', currency: 'USD ($)', notifications_enabled: true, haptics_enabled: false, member_since: 'Sep 2026' }))
    .toEqual({ name: 'Maya', initial: 'M', email: 'm@x.co', currency: 'USD ($)', notificationsEnabled: true, hapticsEnabled: false, memberSince: 'Sep 2026' });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test mappers`
Expected: FAIL.

- [ ] **Step 3: Implement `src/data/repositories/mappers.ts` + the repos**

`mappers.ts`:
```ts
import { CategoryItem, LineItem, RecurringItem, Transaction, UserProfile } from '../../types';

export function mapCategoryRow(row: any): CategoryItem {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    icon: row.icon ?? undefined,
    colorBg: row.color_bg ?? '#DFF0EB',
    colorFg: row.color_fg ?? '#00674F',
    notes: row.notes ?? undefined,
  };
}

export function mapLineItemRow(row: any): LineItem {
  return { id: row.id, name: row.name, quantity: row.quantity ?? undefined, price: Number(row.price) };
}

export function mapTransactionRow(row: any): Transaction {
  return {
    id: row.id,
    name: row.name,
    date: row.date,
    time: row.time ?? '',
    categoryId: row.category_id ?? '',
    type: row.type,
    amount: Number(row.amount),
    icon: row.icon ?? 'receipt',
    note: row.note ?? undefined,
    receiptPath: row.receipt_path ?? undefined,
    items: Array.isArray(row.transaction_items) && row.transaction_items.length
      ? row.transaction_items.map(mapLineItemRow)
      : undefined,
  };
}

export function mapRecurringRow(row: any): RecurringItem {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    amount: Number(row.amount),
    category: row.category_name ?? '',
    icon: row.icon ?? 'calendar',
    colorBg: row.color_bg ?? '#F3E8FF',
    colorFg: row.color_fg ?? '#7C3AED',
    dayOfMonth: row.day_of_month ?? 1,
    active: row.active,
  };
}

export function mapProfileRow(row: any): UserProfile {
  return {
    name: row.name ?? '',
    initial: (row.name ?? '?').charAt(0).toUpperCase(),
    email: row.email ?? '',
    currency: row.currency ?? 'USD ($)',
    notificationsEnabled: row.notifications_enabled,
    hapticsEnabled: row.haptics_enabled,
    memberSince: row.member_since ?? '',
  };
}
```

`profileRepo.ts`:
```ts
import { supabase } from '../../lib/supabase';
import { UserProfile } from '../../types';
import { mapProfileRow } from './mappers';

export async function getProfile(): Promise<UserProfile | null> {
  const { data, error } = await supabase.from('profiles').select('*').maybeSingle();
  if (error) throw error;
  return data ? mapProfileRow(data) : null;
}

export async function upsertProfile(profile: UserProfile): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('not authenticated');
  const { error } = await supabase.from('profiles').upsert({
    user_id: userId,
    name: profile.name,
    email: profile.email,
    currency: profile.currency,
    notifications_enabled: profile.notificationsEnabled,
    haptics_enabled: profile.hapticsEnabled,
    member_since: profile.memberSince,
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function isSeeded(): Promise<boolean> {
  const { data, error } = await supabase.from('profiles').select('seeded').maybeSingle();
  if (error) throw error;
  return data?.seeded ?? false;
}
```

`categoriesRepo.ts`:
```ts
import { supabase } from '../../lib/supabase';
import { CategoryItem } from '../../types';
import { mapCategoryRow } from './mappers';

export async function listCategories(): Promise<CategoryItem[]> {
  const { data, error } = await supabase.from('categories').select('*').order('sort_order').order('created_at');
  if (error) throw error;
  return (data ?? []).map(mapCategoryRow);
}

export async function insertCategory(input: Omit<CategoryItem, 'id'>): Promise<CategoryItem> {
  const { data, error } = await supabase.from('categories').insert({
    name: input.name, type: input.type, icon: input.icon, color_bg: input.colorBg,
    color_fg: input.colorFg, notes: input.notes,
  }).select().single();
  if (error) throw error;
  return mapCategoryRow(data);
}
```

`transactionsRepo.ts`:
```ts
import { supabase } from '../../lib/supabase';
import { Transaction } from '../../types';
import { mapTransactionRow } from './mappers';

export async function listTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase.from('transactions')
    .select('*, transaction_items(*)')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapTransactionRow);
}

export async function insertTransaction(input: Omit<Transaction, 'id'>): Promise<Transaction> {
  const { data, error } = await supabase.from('transactions').insert({
    name: input.name, date: input.date, time: input.time, category_id: input.categoryId || null,
    type: input.type, amount: input.amount, icon: input.icon, note: input.note ?? null,
  }).select().single();
  if (error) throw error;
  if (input.items && input.items.length) {
    const { error: itemsError } = await supabase.from('transaction_items').insert(
      input.items.map((it, i) => ({ transaction_id: data.id, name: it.name, quantity: it.quantity ?? null, price: it.price, position: i }))
    );
    if (itemsError) throw itemsError;
  }
  return mapTransactionRow({ ...data, transaction_items: input.items ?? [] });
}
```

`recurringRepo.ts`:
```ts
import { supabase } from '../../lib/supabase';
import { RecurringItem } from '../../types';
import { mapRecurringRow } from './mappers';

export async function listRecurring(): Promise<RecurringItem[]> {
  const { data, error } = await supabase.from('recurring_items').select('*').order('created_at');
  if (error) throw error;
  return (data ?? []).map(mapRecurringRow);
}

export async function insertRecurring(input: Omit<RecurringItem, 'id' | 'active'>): Promise<RecurringItem> {
  const { data, error } = await supabase.from('recurring_items').insert({
    name: input.name, type: input.type, amount: input.amount, category_name: input.category,
    icon: input.icon, color_bg: input.colorBg, color_fg: input.colorFg, day_of_month: input.dayOfMonth, active: true,
  }).select().single();
  if (error) throw error;
  return mapRecurringRow(data);
}

export async function setRecurringActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('recurring_items').update({ active }).eq('id', id);
  if (error) throw error;
}
```

`storageRepo.ts`:
```ts
import { supabase } from '../../lib/supabase';

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

export async function uploadReceipt(base64: string, mimeType: string): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('not authenticated');
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extFromMime(mimeType)}`;
  const { error } = await supabase.storage.from('receipts').upload(path, base64ToBlob(base64, mimeType), { contentType: mimeType });
  if (error) throw error;
  return path;
}

export async function signedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('receipts').createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

function extFromMime(mimeType: string): string {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('heic')) return 'heic';
  return 'jpg';
}
```

Note: `atob`/`Blob` are available on web and in React Native 0.86's Hermes. If the target native runtime lacks `atob`, replace the `atob` call with a small pure-JS base64 decoder — but do not change the interface.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test mappers`
Expected: PASS.

- [ ] **Step 5: Verify compile and commit**

Run: `npx tsc --noEmit`
```bash
git add src/data/repositories src/data/repositories/__tests__
git commit -m "feat: add supabase repositories with row mapping"
```

---

### Task 6: Seed default categories on first sign-in

**Files:**
- Create: `src/data/seed.ts`
- Test: `src/data/__tests__/seed.test.ts`

**Interfaces:**
- Consumes: `categoriesRepo.listCategories`, `categoriesRepo.insertCategory`, `profileRepo.getProfile`.
- Produces: `seedDefaultCategoriesIfNeeded(): Promise<boolean>` (returns true if it seeded).

- [ ] **Step 1: Write the failing test**

Create `src/data/__tests__/seed.test.ts`:
```ts
import { seedDefaultCategoriesIfNeeded, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../seed';

jest.mock('../repositories/categoriesRepo');
jest.mock('../repositories/profileRepo');

import { listCategories } from '../repositories/categoriesRepo';
import { getProfile } from '../repositories/profileRepo';

const mockList = listCategories as jest.Mock;
const mockProfile = getProfile as jest.Mock;

it('seeds when profile.seeded is false and categories are empty', async () => {
  mockProfile.mockResolvedValue({ seeded: false });
  mockList.mockResolvedValue([]);
  const seeded = await seedDefaultCategoriesIfNeeded();
  expect(seeded).toBe(true);
});

it('does not seed when seeded is true', async () => {
  mockProfile.mockResolvedValue({ seeded: true });
  mockList.mockResolvedValue([]);
  const seeded = await seedDefaultCategoriesIfNeeded();
  expect(seeded).toBe(false);
});

it('exports the expected default categories', () => {
  expect(DEFAULT_EXPENSE_CATEGORIES.length).toBeGreaterThan(0);
  expect(DEFAULT_INCOME_CATEGORIES.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test seed`
Expected: FAIL.

- [ ] **Step 3: Implement `src/data/seed.ts`**

Move the default category definitions out of `src/context/CategoriesContext.tsx` into `seed.ts` as `DEFAULT_EXPENSE_CATEGORIES` / `DEFAULT_INCOME_CATEGORIES` (same shapes), then implement:
```ts
import { CategoryItem } from '../types';
import { isSeeded } from './repositories/profileRepo';
import { insertCategory, listCategories } from './repositories/categoriesRepo';

export const DEFAULT_EXPENSE_CATEGORIES: Omit<CategoryItem, 'id'>[] = [
  { name: 'Food', type: 'expense', icon: 'silverware-fork-knife', colorBg: '#FFF4D6', colorFg: '#FFB800', notes: 'Groceries & dining' },
  { name: 'Shopping', type: 'expense', icon: 'bag-personal-outline', colorBg: '#E0F2FE', colorFg: '#00B4D8', notes: 'Personal items & gear' },
  { name: 'Drinks', type: 'expense', icon: 'glass-wine', colorBg: '#DFF0EB', colorFg: '#2EC4B6', notes: 'Cafes & drinks' },
  { name: 'Travel', type: 'expense', icon: 'car-outline', colorBg: '#E8EFFD', colorFg: '#3B5BDB', notes: 'Commute & transit' },
  { name: 'Fun', type: 'expense', icon: 'play', colorBg: '#FFEEE3', colorFg: '#E67E22', notes: 'Movies & subscriptions' },
  { name: 'Bills', type: 'expense', icon: 'file-document-outline', colorBg: '#F3E8FF', colorFg: '#7C3AED', notes: 'Utilities & rent' },
];

export const DEFAULT_INCOME_CATEGORIES: Omit<CategoryItem, 'id'>[] = [
  { name: 'Salary', type: 'income', icon: 'briefcase-outline', colorBg: '#E8F5E9', colorFg: '#2E7D32', notes: 'Monthly payroll' },
  { name: 'Freelance', type: 'income', icon: 'laptop', colorBg: '#E0F2FE', colorFg: '#0284C7', notes: 'Client contracts & gigs' },
  { name: 'Investments', type: 'income', icon: 'chart-line', colorBg: '#FEF3C7', colorFg: '#D97706', notes: 'Dividends & capital gains' },
  { name: 'Gifts', type: 'income', icon: 'gift-outline', colorBg: '#FFE4E6', colorFg: '#E11D48', notes: 'Occasions & bonuses' },
];

export async function seedDefaultCategoriesIfNeeded(): Promise<boolean> {
  const seeded = await isSeeded();
  if (seeded) return false;
  const existing = await listCategories();
  if (existing.length > 0) return false;
  const all: Omit<CategoryItem, 'id'>[] = [
    ...DEFAULT_EXPENSE_CATEGORIES,
    ...DEFAULT_INCOME_CATEGORIES,
  ];
  for (const cat of all) await insertCategory(cat);
  return true;
}
```

Note: `isSeeded()` (added to `profileRepo` in Task 5) reads the raw `seeded` column directly, so `UserProfile`/`mapProfileRow` stay clean.

- [ ] **Step 4: Run to verify pass**

Run: `npm test seed`
Expected: PASS.

- [ ] **Step 5: Verify compile and commit**

Run: `npx tsc --noEmit`
```bash
git add src/data/seed.ts src/data/__tests__
git commit -m "feat: add default category seeding on first sign-in"
```

---

### Task 7: Refactor CategoriesContext to Supabase

**Files:**
- Modify: `src/context/CategoriesContext.tsx`

**Interfaces:**
- Consumes: `listCategories`, `insertCategory` from `src/data/repositories/categoriesRepo`; `useAuth()`.
- Produces: same public context API `{ expenseCategories, incomeCategories, addCategory }`, now loading from Supabase and adding `loading`/`error`.

- [ ] **Step 1: Refactor the provider**

- Import `listCategories`/`insertCategory` and `useAuth`.
- On mount (and when `session` becomes non-null), call `listCategories()` and split into expense/income by `type`.
- `addCategory` now awaits `insertCategory(item)` and prepends the returned `CategoryItem` to the correct list.
- Expose `loading` and `error` in the context value.
- Remove the now-unused inline `DEFAULT_EXPENSE_CATEGORIES`/`DEFAULT_INCOME_CATEGORIES` (moved to `seed.ts` in Task 6).

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/context/CategoriesContext.tsx
git commit -m "feat: load and persist categories via supabase"
```

---

### Task 8: Refactor TransactionsContext to Supabase

**Files:**
- Modify: `src/context/TransactionsContext.tsx`

**Interfaces:**
- Consumes: `listTransactions`, `insertTransaction` from `src/data/repositories/transactionsRepo`; `useAuth()`; existing `groupTransactionsByDay`.
- Produces: same public API `{ groups, addTransaction }` plus `loading`/`error`, loading from Supabase.

- [ ] **Step 1: Refactor the provider**

- Import `listTransactions`/`insertTransaction`, `useAuth`.
- On session, `listTransactions()` → hold the flat `Transaction[]`; `groups = useMemo(() => groupTransactionsByDay(transactions), [transactions])`.
- `addTransaction(input)` awaits `insertTransaction(input)` then prepends the returned `Transaction` (note: `receiptPath` is set by the caller in `AddTransactionSheet` via `storageRepo` — see Task 10).
- Remove the `seedTransactions` import/seed (DB is now the source). Keep `seedTransactions` in the repo if still referenced elsewhere, but stop seeding state from it.
- Expose `loading`/`error`.

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/context/TransactionsContext.tsx
git commit -m "feat: load and persist transactions via supabase"
```

---

### Task 9: Refactor ProfileScreen (profile + recurring) to Supabase

**Files:**
- Modify: `src/screens/ProfileScreen.tsx`

**Interfaces:**
- Consumes: `getProfile`, `upsertProfile`; `listRecurring`, `insertRecurring`, `setRecurringActive`; `useAuth`.

- [ ] **Step 1: Refactor**

- Replace the `INITIAL_PROFILE`/`INITIAL_RECURRING_ITEMS` seeds with `getProfile()` / `listRecurring()` loaded on session; add `loading`/`error` states.
- Currency change and toggles (notifications/haptics) call `upsertProfile`.
- `handleToggleRecurring` calls `setRecurringActive(id, next)`.
- `handleAddRecurring` calls `insertRecurring(newItem)` and prepends the returned item.

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/screens/ProfileScreen.tsx
git commit -m "feat: load and persist profile and recurring items via supabase"
```

---

### Task 10: Receipt upload + `Transaction.receiptPath`

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/components/AddTransactionSheet.tsx`

**Interfaces:**
- Consumes: `storageRepo.uploadReceipt` from Task 5; `Transaction` type.
- Produces: `Transaction` gains optional `receiptPath?: string`; scanned receipts are uploaded to storage and their path saved on the transaction.

- [ ] **Step 1: Add `receiptPath` to the `Transaction` type**

In `src/types/index.ts`, add to the `Transaction` interface:
```ts
receiptPath?: string;
```

- [ ] **Step 2: Wire the upload into `AddTransactionSheet`**

In `src/components/AddTransactionSheet.tsx`, add a `receiptPath: string | null` state. In the scan handler, after capturing the image (before or after `analyzeReceipt` — do it in parallel with/after capture, before navigating to the form), call `uploadReceipt(base64, mimeType)` and store the returned path. On form submit, include `receiptPath: receiptPath ?? undefined` in the `addTransaction(input)` payload. The `receipt_path` then flows through `TransactionsContext.addTransaction` → `transactionsRepo.insertTransaction` (Task 8 must also pass `receipt_path` — see below).

- [ ] **Step 3: Persist `receipt_path` in `transactionsRepo.insertTransaction`**

In `src/data/repositories/transactionsRepo.ts` (Task 5), update the insert to include `receipt_path: input.receiptPath ?? null`.

- [ ] **Step 4: Verify compile**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/components/AddTransactionSheet.tsx src/data/repositories/transactionsRepo.ts
git commit -m "feat: upload receipts to supabase storage and persist receipt path"
```

---

### Task 11: Wire AuthProvider + gate + first-sign-in seeding + remove mock seeds

**Files:**
- Modify: `App.tsx`
- Modify: `src/data/seedTransactions.ts` (delete or stop importing)

**Interfaces:**
- Consumes: `AuthProvider`, `useAuth`, `seedDefaultCategoriesIfNeeded`, `profileRepo` upsert.

- [ ] **Step 1: Gate the app in `App.tsx`**

Wrap the tree in `AuthProvider` (outside `SafeAreaProvider`). Inside, render:
- if `auth.loading` → a splash `<View>` (spinner).
- else if `!auth.session` → `<LoginScreen />`.
- else → the existing `SafeAreaProvider > CategoriesProvider > TransactionsProvider > NavigationContainer` tree.

Also, on session, ensure a profile row exists and run seeding: add an inner component (e.g. `Bootstrap`) inside `AuthProvider` that, when `session` exists, runs `getProfile()`; if null, `upsertProfile(default)` (name/email from `session.user.user_metadata`), then `seedDefaultCategoriesIfNeeded()`.

- [ ] **Step 2: Remove now-unused mock seed data**

`src/data/seedTransactions.ts` is no longer imported by `TransactionsContext` (Task 8). Delete the file and any remaining references. `src/data/profileData.ts` (`INITIAL_PROFILE`/`INITIAL_RECURRING_ITEMS`) is no longer used by `ProfileScreen` (Task 9) — delete it if no other references remain.

- [ ] **Step 3: Verify compile + tests + runtime**

Run: `npx tsc --noEmit` and `npm test`.
Manual (web, `npm start`): without env vars, the login screen shows; with env vars, sign in via Google/Facebook, verify categories load, add a transaction, toggle a recurring item — all round-trip to Supabase.

- [ ] **Step 4: Commit**

```bash
git add App.tsx src/data/seedTransactions.ts src/data/profileData.ts
git commit -m "feat: gate app behind supabase auth and seed on first sign-in"
```

---

## Self-Review Notes

- Spec §2 architecture/config → Tasks 1, 3.
- Spec §3 schema/RLS/storage → Task 2 (schema) + Task 10 (receipt upload).
- Spec §4 auth (Google/Facebook OAuth, session, profile sync) → Task 4 + Task 11.
- Spec §5 data layer (repos, context refactors, seeding) → Tasks 5–9.
- Spec §6 error/loading/testing → loading/error states in Tasks 7–9; mapper + seed unit tests in Tasks 3, 5, 6.
- Spec §7 out of scope (no realtime, no SecureStore encryption) → honored; auth storage uses AsyncStorage (documented deviation from the SecureStore wording in §2.3). Receipt display via signed URL is not yet wired into the UI (path is persisted; display is a future task).
- Spec §3.5 says recurring uses `category_id`; the plan uses a denormalized `category_name` instead, because the app's `RecurringItem.category` is already a name string (with denormalized icon/colors) and has no link to `CategoriesContext`. This avoids an unnecessary recurring-UI refactor and is a documented refinement.
