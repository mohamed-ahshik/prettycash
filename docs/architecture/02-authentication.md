# 02 — Authentication and Identity

Implementation status: Implemented

## Purpose

Own user authentication, session restoration, identity propagation, and login surfaces across web and native.

## Responsibilities

- Restore, persist, and refresh Supabase sessions.
- Support browser OAuth on web.
- Support native Google Sign-In through Google Play Services / iOS Google SDK.
- Support email OTP/magic links.
- Handle deep links and PKCE code exchange.
- Keep PostHog identity synchronized with the Supabase user.
- Remove the device push token on sign-out.
- Decide whether the app shows login or an anonymous session.

## Main files

- `src/context/AuthContext.tsx` — session state, auth actions, deep-link handling, PostHog identity.
- `src/context/session.ts` — initial session/anonymous-session resolution.
- `src/lib/supabase.ts` — Supabase client, PKCE, storage adapter.
- `src/screens/LoginScreen.tsx` — email, Google, and Facebook entry points.
- `src/services/googleAuth.ts` — native Google SDK → Supabase ID-token exchange.
- `src/lib/notifications.ts` — push-token cleanup on sign-out.
- `src/config.ts` — `SHOW_AUTH_UI` and backend URL resolution.

## Authentication flows

### Browser OAuth

Used on web for Google and on all platforms for Facebook.

```text
LoginScreen
  → AuthContext.signInWithProvider
  → supabase.auth.signInWithOAuth
  → provider
  → Supabase callback
  → app / browser session
```

### Native Google

```text
Google button
  → GoogleSignin.signIn
  → Google ID token
  → supabase.auth.signInWithIdToken({ provider: 'google' })
  → Supabase session
```

Native Google requires:

- an Android OAuth client with the package name and EAS keystore SHA-1,
- an iOS OAuth client and reversed URL scheme for iOS,
- the Web client ID as the token audience,
- an EAS development/production build.

### Email OTP

```text
email → supabase.auth.signInWithOtp
     → email link → app deep link
     → exchangeCodeForSession
```

## Identity and analytics

`AuthProvider` subscribes to Supabase auth changes. When a user signs in, PostHog receives `identify(user.id, { email, name })`; on sign-out, PostHog resets. Email, display name, and Google/Facebook metadata are read from the Supabase user.

## Error handling

- Rate-limit errors are translated by `getAuthErrorMessage`.
- Google cancellation returns silently.
- Missing native module in Expo Go produces a development-build-required error.
- Deep-link errors set `authError`.
- Initial session failures surface through the bootstrap/auth error surface.

## Boundaries

- Auth owns identity and session; it does not own profile fields beyond the initial creation call.
- Data RLS and profile persistence live in the data platform.
- Push-token registration lives in the foundation bootstrap; sign-out cleanup lives here.

## Related documentation

- [[2026-09-16-hide-login-anonymous-auth-design]]
- [[2026-10-31-native-google-signin-design]]
- [[2026-09-16-hide-login-anonymous-auth]]
- [[2026-10-31-native-google-signin]]
- Cross-module: [[2026-09-13-supabase-auth-database-design]]
- Cross-module: [[2026-09-13-supabase-auth-database]]
- [[architecture-index|Back to architecture index]]
