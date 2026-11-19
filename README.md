# prettycash

PrettyCash is a personal finance app for tracking expenses and income, built with Expo, React Native, and Supabase.

## Testing subscriptions

PrettyCash Pro uses Google Play billing through RevenueCat. The hosted RevenueCat paywall is the only purchase UI. Store products and the paywall do not load in Expo Go, so test them with a development or production build.

1. **Upload the build to internal testing.** In the Play Console, create a release on the **Internal testing** track and upload the build.
2. **Add license testers.** Under **License testing**, add the Google accounts that will test purchases. Use a **new account** to receive the `free-trial-7d` offer; Google Play offers the free trial only once per account.
3. **Install from the Play testing link.** Open the testing link on the internal testing page and install from Google Play. A side-loaded APK cannot load Play products.
4. **Use a development or production build.** Expo Go cannot load the native store products or the hosted paywall. Rebuild the development client after changing RevenueCat native packages.
5. **Use the live public key.** The build must carry the live `goog_...` RevenueCat public SDK key in `EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY` (or `EXPO_PUBLIC_REVENUECAT_API_KEY`). A `test_...` key uses the RevenueCat Test Store: purchases complete without real billing and do not prove the Play configuration.
6. **Never put the RevenueCat secret key in the app.** The app only needs the public SDK key. The secret key belongs on the backend and must not appear in the repository, `.env` files, or the app bundle.
7. **Verify the flow:**
   - A purchase creates an active `prettycash_pro` entitlement.
   - `free-trial-7d` starts a 7-day trial with unlimited AI receipt scans.
   - Restore Purchases restores the entitlement on a second install.
   - Turning off auto-renew keeps access until the paid period ends.
   - Letting the subscription cancel or expire blocks AI scans and shows the paywall again.
8. **If products do not appear,** check that:
   - the `prettycash_pro` subscription and its `monthly` / `annual` base plans are active in Play Console;
   - the `free-trial-7d` offer is attached to both base plans;
   - RevenueCat's Google Play service-account credentials validate;
   - both products are attached to the `prettycash_pro` entitlement and the `default` offering is current;
   - the tester installed from the testing link with a licensed account.
