# 01 — App Foundation

Implementation status: Implemented

## Purpose

The foundation module owns the Expo application shell: provider composition, navigation, theming, startup sequencing, fonts, splash/error surfaces, platform wrappers, and shared UI primitives.

## Responsibilities

- Boot the React Native app and load DM Sans.
- Compose providers in the correct dependency order.
- Restore auth before showing authenticated screens.
- Seed the default category set for new users.
- Register the device timezone and Expo push token after authentication.
- Provide light/dark themes and shared design tokens.
- Render the four-tab navigation shell: Home, Insights, Categories, Profile.
- Provide web phone-frame presentation and the shared brand mark.

## Main files

- `App.tsx` — entry point, `Gate`, `Bootstrap`, `AppNavigator`, splash and error UI.
- `src/context/ThemeContext.tsx` — theme preference, system color scheme, themed styles.
- `src/theme/` — colors, palettes, typography, spacing, motion, shadows.
- `src/components/BrandMark.tsx` — the in-app brand mark.
- `src/components/TabBar.tsx` — custom bottom navigation.
- `src/components/BottomSheet.tsx` — shared modal sheet.
- `src/components/EmptyState.tsx`, `Icon.tsx`, `SegmentedControl.tsx` — shared UI primitives.
- `app.json`, `app.config.ts`, `eas.json` — native config, EAS project, Google Sign-In and notifications plugins.
- `assets/` — app icon, adaptive icon, favicon, splash, brand art.

## Provider order

```text
GestureHandlerRootView
  ThemeProvider
    CurrencyProvider
      AuthProvider
        Gate
          LoginScreen (no session)
          Bootstrap
            CategoriesProvider
              TransactionsProvider
                PendingRecurringProvider
                  MonthProvider
                    AppNavigator
                      Home / Insights / Categories / Profile
```

The order matters: data providers depend on an authenticated session; `PendingRecurringProvider` depends on both auth and transaction refresh; navigation is mounted only after bootstrap succeeds.

## Startup and failure behavior

- Fonts missing → render nothing until loaded.
- Auth loading → splash.
- No session and auth UI enabled → login.
- Bootstrap failure → retry surface.
- Bootstrap loading → splash.
- New user → profile upsert + default category seeding before the tabs appear.
- App foreground → resync timezone and push token.

## Navigation

The app uses React Navigation bottom tabs with custom screen transitions. PostHog screen tracking is wired manually through `NavigationContainer` refs to avoid navigation-state hook crashes.

## Theming and visual language

- Light and dark palettes are resolved by `ThemeProvider`.
- The user can force light/dark or follow the system.
- Components use theme tokens rather than hard-coded colors.
- The design system includes DM Sans typography, rounded cards, soft borders, elevation tokens, and motion durations.

## Native configuration

- `expo-notifications` is configured as a native plugin.
- `@react-native-google-signin/google-signin` is configured with the iOS URL scheme through `app.config.ts` when `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` is present.
- Android uses `google-services.json` for Firebase/FCM registration.
- EAS development builds are required for native Google Sign-In and push notifications; Expo Go cannot load those native modules.

## Related documentation

- [[2026-09-10-expo-migration-design]]
- [[2026-09-10-prettycash-main-pages-design]]
- [[2026-09-18-premium-polish-design]]
- [[2026-09-20-dark-mode-design]]
- [[2026-09-10-prettycash-main-pages]]
- [[2026-09-20-dark-mode]]
- [[architecture-index|Back to architecture index]]
