# Hide Login UI with Anonymous Session — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open the app directly into the main tabs by automatically creating a Supabase anonymous session, removing the login page from the launch flow while keeping auth/RLS and the data layer unchanged.

**Architecture:** A `SHOW_AUTH_UI` constant in `src/config.ts` toggles the login UI. A new, dependency-light `src/context/session.ts` module resolves the initial session (persisted session → anonymous sign-in), which `AuthProvider` calls and exposes via `authError` / `retrySession`. `App.tsx`'s `Gate` renders `LoginScreen` only when `SHOW_AUTH_UI` is true, otherwise an error screen with Retry. Spec deviation (intentional): the helper lives in `session.ts` rather than inline in `AuthContext.tsx` so it can be unit-tested without importing `expo-web-browser`/`expo-auth-session`.

**Tech Stack:** `@supabase/supabase-js`, React Native (Expo SDK ~57), `jest-expo`, TypeScript.

## Global Constraints

- Expo SDK `~57.0.21`/`~57.0.23`; consult https://docs.expo.dev/versions/v57.0.0/ before writing Expo code.
- No code comments in source.
- `npx tsc --noEmit` and `npm test` must pass after each task.
- Do not change the data layer, repositories, DB schema, or the auth UI's existing components beyond what each task specifies.
- Keep `signInWithProvider` and `signOut` behavior unchanged.
- `npx expo install` (not `npm install`) for any Expo package — but this plan adds no dependencies.

**Implementation status:** Not started

---

### Task 1: `SHOW_AUTH_UI` flag + `resolveInitialSession` helper

**Files:**
- Modify: `src/config.ts`
- Create: `src/context/session.ts`
- Test: `src/context/__tests__/session.test.ts`

**Interfaces:**
- Produces: `SHOW_AUTH_UI: boolean` exported from `src/config.ts`.
- Produces: `resolveInitialSession(showAuthUI?: boolean): Promise<{ session: Session | null; error: string | null }>` exported from `src/context/session.ts`. Defaults `showAuthUI` to `SHOW_AUTH_UI`.

- [ ] **Step 1: Write the failing test**

Create `src/context/__tests__/session.test.ts`:

```ts
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signInAnonymously: jest.fn(),
    },
  },
}));

import { supabase } from '../../lib/supabase';
import { resolveInitialSession } from '../session';

const mockGetSession = supabase.auth.getSession as unknown as jest.Mock;
const mockSignInAnonymously = supabase.auth.signInAnonymously as unknown as jest.Mock;

beforeEach(() => {
  mockGetSession.mockReset();
  mockSignInAnonymously.mockReset();
});

describe('resolveInitialSession', () => {
  it('returns an existing session without signing in anonymously', async () => {
    const session = { access_token: 'existing' };
    mockGetSession.mockResolvedValue({ data: { session } });

    await expect(resolveInitialSession(false)).resolves.toEqual({ session, error: null });
    expect(mockSignInAnonymously).not.toHaveBeenCalled();
  });

  it('signs in anonymously when there is no session and auth UI is hidden', async () => {
    const session = { access_token: 'anon' };
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignInAnonymously.mockResolvedValue({ data: { session }, error: null });

    await expect(resolveInitialSession(false)).resolves.toEqual({ session, error: null });
    expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('returns the error when anonymous sign-in fails', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignInAnonymously.mockResolvedValue({
      data: { session: null },
      error: { message: 'Anonymous sign-ins are disabled' },
    });

    await expect(resolveInitialSession(false)).resolves.toEqual({
      session: null,
      error: 'Anonymous sign-ins are disabled',
    });
  });

  it('returns no session without anonymous sign-in when auth UI is shown', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    await expect(resolveInitialSession(true)).resolves.toEqual({ session: null, error: null });
    expect(mockSignInAnonymously).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/context/__tests__/session.test.ts`
Expected: FAIL — `Cannot find module '../session'`.

- [ ] **Step 3: Add the flag**

In `src/config.ts`, add above `getVisionConfig`:

```ts
export const SHOW_AUTH_UI = false;
```

- [ ] **Step 4: Implement the helper**

Create `src/context/session.ts`:

```ts
import { Session } from '@supabase/supabase-js';
import { SHOW_AUTH_UI } from '../config';
import { supabase } from '../lib/supabase';

export interface InitialSession {
  session: Session | null;
  error: string | null;
}

export async function resolveInitialSession(
  showAuthUI: boolean = SHOW_AUTH_UI,
): Promise<InitialSession> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return { session: data.session, error: null };
  if (showAuthUI) return { session: null, error: null };

  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error) return { session: null, error: error.message };
  return { session: anon.session ?? null, error: null };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/context/__tests__/session.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Verify compile and full suite**

Run: `npx tsc --noEmit && npm test`
Expected: success, all suites pass.

- [ ] **Step 7: Commit**

```bash
git add src/config.ts src/context/session.ts src/context/__tests__/session.test.ts
git commit -m "feat: add SHOW_AUTH_UI flag and anonymous session resolver"
```

---

### Task 2: Wire `AuthProvider` to the resolver

**Files:**
- Modify: `src/context/AuthContext.tsx`

**Interfaces:**
- Consumes: `resolveInitialSession` from `src/context/session.ts` (Task 1).
- Produces: `AuthContextType` gains `authError: string | null` and `retrySession: () => Promise<void>`. `useAuth()` consumers (e.g. `App.tsx`) rely on these names.

- [ ] **Step 1: Import the resolver and `useCallback`**

In `src/context/AuthContext.tsx`, change the React import line to include `useCallback`:

```ts
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
```

Add below the `supabase` import:

```ts
import { resolveInitialSession } from './session';
```

- [ ] **Step 2: Extend the context type**

In `interface AuthContextType`, add:

```ts
  authError: string | null;
  retrySession: () => Promise<void>;
```

- [ ] **Step 3: Add state and the resolver runner**

Replace the `const [loading, setLoading] = useState(true);` block and the `useEffect` that calls `supabase.auth.getSession()` with:

```ts
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const retrySession = useCallback(async () => {
    setLoading(true);
    const { session: next, error } = await resolveInitialSession();
    setSession(next);
    setAuthError(error);
    setLoading(false);
  }, []);

  useEffect(() => {
    retrySession();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setAuthError(null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [retrySession]);
```

- [ ] **Step 4: Expose the new values**

Change the provider value to:

```ts
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, loading, authError, signInWithProvider, signOut, retrySession }}
    >
      {children}
    </AuthContext.Provider>
```

- [ ] **Step 5: Verify compile and full suite**

Run: `npx tsc --noEmit && npm test`
Expected: success, all suites pass.

- [ ] **Step 6: Commit**

```bash
git add src/context/AuthContext.tsx
git commit -m "feat: auto-resolve anonymous session in AuthProvider"
```

---

### Task 3: Gate renders login only when enabled; add auth error screen

**Files:**
- Modify: `App.tsx`
- Modify: `docs/superpowers/specs/2026-09-16-hide-login-anonymous-auth-design.md` (Implementation status)

**Interfaces:**
- Consumes: `SHOW_AUTH_UI` from `src/config.ts` (Task 1); `authError` and `retrySession` from `useAuth()` (Task 2).

- [ ] **Step 1: Import the flag**

In `App.tsx`, add to the imports:

```ts
import { SHOW_AUTH_UI } from './src/config';
```

- [ ] **Step 2: Update `Gate`**

Replace the `if (!session) { ... }` block in `Gate` with:

```tsx
  if (!session) {
    if (SHOW_AUTH_UI) {
      return (
        <SafeAreaProvider>
          <LoginScreen />
        </SafeAreaProvider>
      );
    }
    return (
      <AuthError
        error={
          authError ??
          'Could not start a session. Enable Anonymous sign-ins in Supabase (Authentication → Providers), then retry.'
        }
        onRetry={retrySession}
      />
    );
  }
```

And change the `useAuth()` destructure at the top of `Gate` to:

```ts
  const { session, loading, authError, retrySession } = useAuth();
```

- [ ] **Step 3: Add the `AuthError` component**

Add below `BootstrapError` in `App.tsx`:

```tsx
function AuthError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <View style={styles.errorWrap}>
      <Text style={styles.errorTitle}>Sign-in unavailable</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <Pressable style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </Pressable>
    </View>
  );
}
```

(`LoginScreen` import stays — it is still referenced when `SHOW_AUTH_UI` is true.)

- [ ] **Step 4: Verify compile and full suite**

Run: `npx tsc --noEmit && npm test`
Expected: success, all suites pass.

- [ ] **Step 5: Manual smoke test**

Run: `npx expo start` and open the app (web or device).
Expected: no login page; the app proceeds to the main tabs or shows the "Sign-in unavailable" screen with Retry if anonymous sign-ins are disabled. If the DB schema has not been applied, the existing bootstrap error screen appears instead — that is expected and out of scope.

- [ ] **Step 6: Mark the spec implemented**

In `docs/superpowers/specs/2026-09-16-hide-login-anonymous-auth-design.md`, set:

```
**Implementation status:** Implemented
```

- [ ] **Step 7: Commit**

```bash
git add App.tsx docs/superpowers/specs/2026-09-16-hide-login-anonymous-auth-design.md
git commit -m "feat: hide login gate behind SHOW_AUTH_UI with auth error screen"
```
