# PrettyCash — Hide Login UI with Anonymous Session (Spec)

**Date:** 2026-09-16
**Status:** Approved for implementation
**Implementation status:** Implemented

---

## 1. Overview & Objective

Remove the login page from the launch flow so the app opens directly into the main tabs, while keeping Supabase auth and RLS functional via an automatic **anonymous session**. Real sign-in (Google/Facebook) is deferred and will be re-enabled later by flipping a flag.

The data layer, repositories, and DB schema are **not** changed by this work — every context still reads/writes Supabase the same way; they simply always have a session available.

---

## 2. Architecture & Configuration

### 2.1 Feature flag
Add to `src/config.ts`:
```ts
export const SHOW_AUTH_UI = false;
```
- `false` (current): auto anonymous session, no login screen.
- `true`: current behavior — show `LoginScreen` when there is no session.

This is a compile-time constant (not an env var) so it is trivially reversible.

### 2.2 Session resolution
Extract the session-bootstrapping decision into a testable helper in `src/context/AuthContext.tsx`:
```ts
export async function resolveInitialSession(
  showAuthUI: boolean = SHOW_AUTH_UI,
): Promise<{ session: Session | null; error: string | null }>;
```
Behavior:
1. `supabase.auth.getSession()` — if a persisted session exists (anonymous or real), return it.
2. No session and `showAuthUI === true` — return `{ session: null, error: null }` (login path).
3. No session and `showAuthUI === false` — call `supabase.auth.signInAnonymously()`:
   - success → return the new session.
   - failure → return `{ session: null, error: error.message }`.

The existing init effect in `AuthProvider` calls `resolveInitialSession()`, sets `session`, `authError`, and `loading`, then subscribes to `onAuthStateChange`. To avoid clearing `loading` before the resolver settles (which would flash the pre-app screen during the anonymous sign-in network call), the handler ignores supabase-js's initial `INITIAL_SESSION` event and only reacts to subsequent auth-state events.

### 2.3 Context surface
`AuthContextType` gains:
- `authError: string | null`
- `retrySession: () => Promise<void>` — sets `loading = true`, re-runs `resolveInitialSession()`, then updates `session`, `authError`, and `loading`.

`signInWithProvider` and `signOut` remain unchanged.

---

## 3. App Gate

`App.tsx` `Gate` logic:
- `loading` → `<Splash />` (unchanged).
- no session and `SHOW_AUTH_UI` → `<LoginScreen />` (component kept in the repo).
- no session and `!SHOW_AUTH_UI` → an error screen showing `authError` (or a default message) with a **Retry** button wired to `retrySession`.
- session present → existing `Bootstrap` → navigator tree (unchanged).

The error path is shown (rather than falling back to `LoginScreen`) because the login UI is intentionally hidden. The message should state that anonymous sign-in failed and that "Anonymous sign-ins" must be enabled in the Supabase dashboard (Authentication → Providers).

Add a small `AuthError` component in `App.tsx` (styled like `BootstrapError`: title, message, Retry button).

---

## 4. Error Handling

- Anonymous sign-in failure is surfaced through `authError` and blocks at the gate with a Retry action (no silent failure).
- Network errors during `getSession()`/`signInAnonymously()` follow the same path.
- A session that appears later via `onAuthStateChange` clears/overrides the error path.

---

## 5. Testing

Unit-test `resolveInitialSession` with a mocked `@supabase/supabase-js` client (same pattern as `src/lib/__tests__/supabaseStorage.test.ts`):
1. Persisted session present → returns it, does **not** call `signInAnonymously`.
2. No session, `showAuthUI = false` → calls `signInAnonymously`, returns the new session.
3. No session, `showAuthUI = false`, anonymous error → returns the error message and `session: null`.
4. No session, `showAuthUI = true` → returns `null` session, no anonymous call.

No new test dependencies required.

---

## 6. Prerequisites & Dependencies

- **Anonymous sign-ins must be enabled** in the Supabase project (Authentication → Providers → Anonymous). Off by default; the gate's error message covers this.
- **The database schema must exist** for the app to show real data: migration `supabase/migrations/20260913000000_init.sql` is currently recorded as applied but was never executed (tables `profiles`, `categories`, `transactions`, `transaction_items`, `recurring_items` and the `receipts` bucket do not exist). Fixing this is a prerequisite for data to load, but is **out of scope** for this spec.

---

## 7. Out of Scope

- Implementing real auth (Google/Apple/Facebook) — deferred.
- Local/offline data mode or repository stubbing.
- Applying/repairing the Supabase migration.
- Re-enabling provider buttons (Google remains hidden behind `SHOW_GOOGLE_SIGN_IN`).
