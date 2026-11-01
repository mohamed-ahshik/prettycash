# Native Google Sign-In Implementation Plan

Implementation status: Implemented; Android development build finished; device sign-in verification pending

## 1. Native Google auth service

- [x] Add `src/services/googleAuth.ts`.
- [x] Lazily load `@react-native-google-signin/google-signin` only on native.
- [x] Validate `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`.
- [x] Configure the SDK with the Web client ID and iOS client ID.
- [x] Run Android Play Services availability check.
- [x] Return `cancelled` when the user dismisses the sheet.
- [x] Exchange the ID token through `supabase.auth.signInWithIdToken`.

## 2. AuthContext integration

- [x] On native Google, call `signInWithGoogleNative()` instead of opening the browser.
- [x] Keep browser OAuth for web Google and all Facebook flows.
- [x] Keep the existing deep-link handler for email OTP and Facebook.

## 3. Expo/EAS configuration

- [x] Remove the bare Google plugin entry from `app.json`.
- [x] Add `app.config.ts` to inject the Google config plugin with the iOS URL scheme derived from `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`.
- [x] Add `eas.json` with a development-client profile.
- [x] Add the Google environment variables to `.env.example`.
- [x] Link the EAS project and set project-scoped development environment values.
- [x] Queue the Android development build: `a856a697-8893-45b5-a24b-2b0f07c1276e`.
- [x] Verify the queued Android build finished.
- [ ] Install the APK and complete a native Google sign-in test.

APK: https://expo.dev/artifacts/eas/0kvMxjXU757GGnTII_T_bDHOYwidnJoizgw612UnZJk.apk

## Android OAuth client

Add this EAS keystore SHA-1 to the Android OAuth client for `com.mohamedahshik.prettycash`:

```text
17:DB:2C:70:69:74:15:4B:46:65:1F:3D:0C:24:C8:67:83:49:D3:CD
```

## 4. Verification

- [x] Write failing service tests first.
- [x] Run `npm test` (164 passing).
- [x] Run `npx tsc --noEmit`.
- [x] Export the web bundle.
- [ ] Build the EAS development client for Android and verify the native Google sheet.
- [ ] Add the EAS keystore SHA-1 to the Android OAuth client.
- [ ] iOS: add an iOS OAuth client ID and build later.

## Blockers

- Android sign-in requires the EAS keystore SHA-1 in the Google Cloud Android OAuth client.
- iOS requires an iOS OAuth client ID for `com.mohamedahshik.prettycash`.
