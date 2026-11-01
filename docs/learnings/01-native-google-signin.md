# 01 — Native Google Sign-In with Supabase

**Date:** 2026-10-31  
**Status:** Working on Android via EAS development build  
**Scope:** Why browser OAuth failed on mobile, and why the native Google SDK + Supabase ID-token flow works.

---

## 1. The core lesson

There are **two completely different Google authentication flows**, and they fail for different reasons.

| Flow | Who authenticates | How the app gets the session |
|---|---|---|
| **Browser OAuth** (`signInWithOAuth`) | A web browser | Redirects through Google → Supabase → app with a code |
| **Native ID token** (`signInWithIdToken`) | Google Play Services / Google SDK | Google returns a signed ID token directly to the app |

The original implementation used **browser OAuth on mobile**. The fix switched mobile to **native ID token authentication**.

---

## 2. Why the original mobile flow failed

The original flow was:

```text
App → in-app browser → Google account chooser
    → Supabase callback → exp:// or prettycash:// redirect
    → app exchanges code for session
```

It had two fragile parts:

1. **The in-app browser / webview context.** Google is restrictive about OAuth inside embedded browsers on mobile.
2. **The return redirect.** Expo Go cannot own `prettycash://`; it uses `exp://...`, which adds another handoff that can fail.

The browser hung at Google's account chooser. The app never received a callback.

Web worked because it used a normal browser and a normal HTTPS redirect. That proved:

- the Google client and secret were valid,
- Google consent was configured,
- Supabase's callback worked.

So the failure was specifically the **mobile browser handoff**, not the OAuth credentials.

---

## 3. Why the native flow works

The working flow is:

```text
Tap Google
  → Google Play Services verifies the installed Android app
  → native Google account sheet
  → Google returns an ID token
  → app sends the ID token to Supabase
  → Supabase verifies it and creates the session
```

There is:

- no browser,
- no redirect URL,
- no PKCE code exchange,
- no `exp://` or deep-link handoff,
- no Supabase callback for the native Google login.

That removes every fragile part of the original mobile flow.

---

## 4. Why the Android SHA-1 was required

This was the most important configuration piece.

The native SDK asks Google Play Services:

> "This app claims to be `com.mohamedahshik.prettycash`. Is its signing certificate authorized?"

Google checks the **Android OAuth client** for:

- package name
- SHA-1 fingerprint of the signing keystore

If they do not match, Google rejects the request with **`DEVELOPER_ERROR` (code 10)**.

The EAS build was signed with **EAS's keystore**, not the local debug keystore. That is why the EAS SHA-1 had to be registered:

```text
17:DB:2C:70:69:74:15:4B:46:65:1F:3D:0C:24:C8:67:83:49:D3:CD
```

Different signing key → different SHA-1 → must be registered separately.

---

## 5. Why the Web client ID was still used

The Web client ID did **not** become obsolete.

It has two jobs:

1. **Supabase uses it** to configure the Google provider and verify tokens.
2. **The native Google SDK uses it as `webClientId`**, which determines the token's audience.

The native Google ID token is issued for the **Web client ID**, not the Android client ID. Supabase checks that audience when verifying the token.

So the roles are:

| Item | Purpose |
|---|---|
| **Web client ID** | Token audience; Supabase provider; web OAuth |
| **Android client** | Verifies the APK package + signing SHA-1 |
| **Android client ID** | Not used in code or `.env` |
| **EAS SHA-1** | Identifies the EAS-signed APK |
| **Supabase redirect URLs** | Only for browser OAuth, not native Google |
| **EAS development build** | Includes the native Google module |

The Android OAuth client has no secret and no redirect URI. It is only proof that the installed app is allowed to request a Google token.

---

## 6. Why Expo Go could not be used

`@react-native-google-signin/google-signin` is a **native module**. Expo Go contains a fixed set of native code and cannot load custom native modules.

So:

- Expo Go → browser OAuth only
- Development build / EAS build → native Google SDK

That is why the native SDK could not work in Expo Go, even though Expo Go could run the rest of the app.

---

## 7. Why one SHA-1 was not enough

Every Android signing key produces a different SHA-1:

- local debug build → debug keystore SHA-1
- EAS build → EAS keystore SHA-1
- Play Store build → Play App Signing SHA-1

Google's Android OAuth client allows one SHA-1 per client. If you need both debug and EAS builds, create separate Android OAuth clients with the same package name but different SHA-1 values.

---

## 8. Final mental model

Think of it as three separate identities:

1. **Who is the app?**
   - Android package + SHA-1
   - Verified by Google Play Services

2. **Who is the token for?**
   - Web client ID
   - Verified by Supabase as the token audience

3. **Who verifies the login?**
   - Supabase
   - Creates the Supabase session and JWT

Once those three are aligned, native Google Sign-In works.

---

## 9. Checklist for future native social login

- [ ] Use a development build, not Expo Go.
- [ ] Install the native provider SDK.
- [ ] Create the platform OAuth client with the correct package/bundle and signing fingerprint.
- [ ] Keep the Web client configured in Supabase.
- [ ] Send the native ID token to Supabase with `signInWithIdToken`.
- [ ] Use the same Supabase auth state/session handling as before.
- [ ] Remember that Google Cloud changes can take a few minutes to propagate.

For iOS, the equivalent pieces will be an iOS OAuth client with the bundle ID, the reversed client ID as `iosUrlScheme`, and the same Web client ID as the token audience.

---

## 10. Project-specific implementation

- Native service: `src/services/googleAuth.ts`
- Native routing: `src/context/AuthContext.tsx` → `signInWithProvider('google')`
- EAS config: `eas.json`, `app.config.ts`
- Google env: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- iOS env (deferred): `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
