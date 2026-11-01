# Native Google Sign-In with Supabase (EAS Development Build)

Implementation status: Implemented; Android development build finished; device sign-in verification pending; iOS client ID deferred

## Goal

Make Google sign-in work on Android and iOS without the Google account chooser hanging inside Expo Go's in-app browser. Web continues to use Supabase OAuth.

For this iteration, Android is configured and tested first. iOS configuration is wired but requires an iOS OAuth client ID.

## Approach

- Use `@react-native-google-signin/google-signin` on native.
- Get the Google ID token from the native SDK.
- Exchange it with `supabase.auth.signInWithIdToken({ provider: 'google', token })`.
- Keep the resulting Supabase user/session/PostHog flow unchanged.
- Keep Facebook and email OTP flows unchanged.
- Use an EAS development build; Expo Go is not supported for native Google sign-in.

## Configuration

- Web Google client ID: Supabase provider and `GoogleSignin.configure({ webClientId })`.
- iOS Google client ID: `GoogleSignin.configure({ iosClientId })` and config plugin `iosUrlScheme`.
- Android Google client: package `com.mohamedahshik.prettycash` plus the SHA-1 of the EAS build keystore.
- Environment variables:
  - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
  - `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`

## Behaviour

- Native Google tap opens the OS Google account sheet.
- Cancellation returns silently.
- Missing native module, missing configuration, missing ID token, and Supabase errors surface through `authError`.
- Native module unavailable in Expo Go produces a clear "development build required" error.

## Testing

- Unit-test the native Google service with mocked Google SDK and Supabase.
- Preserve existing tests.
- Run TypeScript compilation.
- Build an EAS development client for Android first; iOS requires an Apple account.

## Out of scope

- Facebook native SDK.
- Removing the existing browser OAuth flow used by web and Facebook.
- Production EAS build/release signing.
