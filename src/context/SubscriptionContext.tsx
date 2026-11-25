import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Purchases, {
  type CustomerInfo,
  type PurchasesOfferings,
} from 'react-native-purchases';
import { Alert, Platform } from 'react-native';
import { fetchEntitlement, type BackendEntitlement } from '../services/billing';
import { useAuth } from './AuthContext';
import { entitlementState } from '../lib/entitlement';
import { isTestStoreKey, resolveRevenueCatApiKey, type RevenueCatKeyResolution } from '../lib/revenuecatKey';
import { paywallAction } from '../lib/paywallResult';
import { PLAY_STORE_SUBSCRIPTIONS_URL } from '../config';

export type SimulationMode = 'trial' | 'expired' | 'pro' | null;

interface SimulationOverride {
  isPro: boolean;
  isTrial: boolean;
  expirationDate: string | null;
}

interface SubscriptionContextValue {
  isPro: boolean;
  isTrial: boolean;
  expirationDate: string | null;
  willRenew: boolean;
  managementURL: string;
  canScan: boolean;
  isReady: boolean;
  offerings: PurchasesOfferings | null;
  simulation: SimulationMode;
  openPaywall: () => void;
  restorePurchases: () => Promise<boolean>;
  refresh: () => Promise<void>;
  simulate: (mode: SimulationMode) => void;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);
const ENTITLEMENT_ID = 'prettycash_pro';
const DAY_MS = 24 * 60 * 60 * 1000;

let configuredApiKey: string | null = null;
let revenueCatUI: typeof import('react-native-purchases-ui') | null | undefined;

function getRevenueCatUI(): typeof import('react-native-purchases-ui') | null {
  if (revenueCatUI !== undefined) return revenueCatUI;
  try {
    revenueCatUI = require('react-native-purchases-ui') as typeof import('react-native-purchases-ui');
  } catch {
    revenueCatUI = null;
  }
  return revenueCatUI;
}

function getApiKey(): RevenueCatKeyResolution {
  // Every process.env.EXPO_PUBLIC_* read here must be a static member access.
  // Expo substitutes those at bundle time; a computed lookup such as
  // process.env[name] is left untouched and reads as undefined in a release build.
  return resolveRevenueCatApiKey({
    platform: Platform.OS,
    sharedKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY,
    androidKey: process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY,
    iosKey: process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY,
  });
}

function ensureConfigured(): string | null {
  const { apiKey } = getApiKey();
  if (apiKey === null) {
    console.warn('[RevenueCat] API key is not configured for this platform.');
    return null;
  }

  if (configuredApiKey !== apiKey) {
    if (!__DEV__ && isTestStoreKey(apiKey)) {
      console.warn(
        '[RevenueCat] Using a Test Store key in a release build. ' +
          'Purchases will not be billed. Replace it with a live store key before publishing.',
      );
    }
    try {
      Purchases.configure({ apiKey });
      configuredApiKey = apiKey;
    } catch (error) {
      console.warn('[RevenueCat] failed to configure', error);
      return null;
    }
  }

  return apiKey;
}

async function currentAppUserID(): Promise<string | null> {
  try {
    return await Purchases.getAppUserID();
  } catch {
    return null;
  }
}

function showPaywallUnavailableAlert(onRetry: () => void) {
  Alert.alert(
    'PrettyCash Pro',
    'Subscriptions are temporarily unavailable. Please try again later.',
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Try again', onPress: onRetry },
    ],
  );
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [simulation, setSimulation] = useState<SimulationMode>(null);
  const [simulationOverride, setSimulationOverride] = useState<SimulationOverride | null>(null);
  const [backendEntitlement, setBackendEntitlement] = useState<BackendEntitlement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const presentingPaywall = useRef(false);
  const hadSession = useRef(false);
  const refreshGeneration = useRef(0);
  const identifiedUserId = useRef<string | null>(null);
  const logoutPromiseRef = useRef<Promise<unknown> | null>(null);
  const loginPromiseRef = useRef<Promise<boolean> | null>(null);
  const identityGeneration = useRef(0);

  const state = entitlementState(customerInfo, ENTITLEMENT_ID);
  const isPro =
    simulationOverride?.isPro ??
    (customerInfo ? state.isPro : Boolean(backendEntitlement?.isPro));
  const isTrial = simulationOverride?.isTrial ?? state.isTrial;
  const expirationDate = simulationOverride?.expirationDate ?? state.expirationDate;
  const willRenew = state.willRenew;
  const managementURL = state.managementURL ?? PLAY_STORE_SUBSCRIPTIONS_URL;
  const canScan = isPro;

  const logOutQuietly = useCallback(() => {
    if (configuredApiKey === null) return;
    identityGeneration.current += 1;
    identifiedUserId.current = null;
    try {
      logoutPromiseRef.current = Purchases.logOut().catch((error) => {
        console.warn('[RevenueCat] failed to log out', error);
      });
    } catch (error) {
      console.warn('[RevenueCat] failed to log out', error);
    }
  }, []);

  const ensureIdentified = useCallback(async (): Promise<boolean> => {
    const userId = session?.user?.id;
    if (!userId) return false;

    if (identifiedUserId.current === userId) return true;
    if (ensureConfigured() === null) return false;

    const generation = identityGeneration.current;

    let existing = loginPromiseRef.current;
    while (existing) {
      await existing;
      if (identityGeneration.current !== generation) return false;
      if (identifiedUserId.current === userId) return true;
      const next = loginPromiseRef.current;
      if (next === existing) break;
      existing = next;
    }

    const loginPromise = (async () => {
      try {
        if ((await currentAppUserID()) === userId) {
          if (identityGeneration.current !== generation) return false;
          identifiedUserId.current = userId;
          return true;
        }

        // A previous logout must finish before logging in as the next user.
        if (logoutPromiseRef.current) {
          await logoutPromiseRef.current;
        }

        await Purchases.logIn(userId);
        if (identityGeneration.current !== generation) return false;
        identifiedUserId.current = userId;
        return true;
      } catch (error) {
        console.warn('[RevenueCat] failed to identify user', error);
        return false;
      }
    })();

    loginPromiseRef.current = loginPromise;
    try {
      return await loginPromise;
    } finally {
      if (loginPromiseRef.current === loginPromise) loginPromiseRef.current = null;
    }
  }, [session?.user?.id]);

  const refresh = useCallback(async () => {
    const generation = refreshGeneration.current + 1;
    refreshGeneration.current = generation;

    const userId = session?.user?.id;
    if (!userId) return;

    const backendTask = fetchEntitlement()
      .then((value) => {
        if (refreshGeneration.current === generation) setBackendEntitlement(value);
      })
      .catch((error) => {
        console.warn('[RevenueCat] failed to load backend entitlement', error);
      });

    const identified = await ensureIdentified();

    // A newer refresh (new session or explicit retry) supersedes this one.
    if (refreshGeneration.current !== generation) return;

    const loadCustomerInfo = identified || (await currentAppUserID()) === userId;
    const loadOfferings = identified;

    if (refreshGeneration.current !== generation) return;

    if (!loadCustomerInfo) {
      // Do not retain a previous user's CustomerInfo; the backend isPro
      // fallback applies until the SDK can identify the current user.
      setCustomerInfo(null);
    }

    // Each request applies its own state as soon as it settles. Backend and
    // offerings never hold back CustomerInfo, so a slow response cannot leave
    // the UI gated behind a stale subscription state.
    let customerInfoApplied = false;
    const customerInfoTask = (async () => {
      try {
        if (!loadCustomerInfo) return;
        const info = await Purchases.getCustomerInfo();
        if (refreshGeneration.current === generation) {
          setCustomerInfo(info);
          customerInfoApplied = true;
          setIsReady(true);
        }
      } catch (error) {
        console.warn('[RevenueCat] failed to load customer info', error);
      }
    })();

    const offeringsTask = loadOfferings
      ? Purchases.getOfferings()
          .then((next) => {
            if (refreshGeneration.current === generation) setOfferings(next);
          })
          .catch((error) => {
            console.warn('[RevenueCat] failed to load offerings', error);
          })
      : Promise.resolve();

    // CustomerInfo is authoritative and releases readiness as soon as it
    // arrives. Only the fallback path waits for the backend, so a Pro user
    // never flashes as free while that source is pending.
    await Promise.allSettled([backendTask, customerInfoTask]);
    if (refreshGeneration.current === generation && !customerInfoApplied) {
      setIsReady(true);
    }

    // Offerings are independent and already handled; do not block readiness.
    void offeringsTask;
  }, [ensureIdentified, session?.user?.id]);

  useEffect(() => {
    ensureConfigured();

    // Auth has not resolved yet. Configuration must still run at startup, but
    // clearing state or logging out now would race session restoration.
    if (loading) return;

    const userId = session?.user?.id;

    if (!userId) {
      refreshGeneration.current += 1;
      setIsReady(false);
      setCustomerInfo(null);
      setOfferings(null);
      setBackendEntitlement(null);
      if (hadSession.current) {
        hadSession.current = false;
        logOutQuietly();
      }
      return;
    }

    hadSession.current = true;

    void refresh().catch((error) => {
      console.warn('[RevenueCat] failed to refresh subscription state', error);
    });

    if (configuredApiKey === null) return;

    const listener = (info: CustomerInfo) => {
      if (identifiedUserId.current !== userId) return;
      setCustomerInfo(info);
    };
    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [session?.user?.id, loading, refresh, logOutQuietly]);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    const userId = session?.user?.id;
    const identified = await ensureIdentified();
    if (!identified || !userId) {
      throw new Error('RevenueCat user is not identified');
    }

    const next = await Purchases.restorePurchases();
    if ((await currentAppUserID()) !== userId) {
      throw new Error('RevenueCat user changed while restoring purchases');
    }

    setCustomerInfo(next);
    return next.entitlements.active[ENTITLEMENT_ID] != null;
  }, [ensureIdentified, session?.user?.id]);

  const simulate = useCallback((mode: SimulationMode) => {
    setSimulation(mode);
    if (mode === 'trial') {
      setSimulationOverride({
        isPro: true,
        isTrial: true,
        expirationDate: new Date(Date.now() + 7 * DAY_MS).toISOString(),
      });
    } else if (mode === 'expired') {
      setSimulationOverride({
        isPro: false,
        isTrial: false,
        expirationDate: null,
      });
    } else if (mode === 'pro') {
      setSimulationOverride({
        isPro: true,
        isTrial: false,
        expirationDate: null,
      });
    } else {
      setSimulationOverride(null);
    }
  }, []);

  const presentRevenueCatPaywall = useCallback(async (): Promise<void> => {
    if (presentingPaywall.current) return;
    presentingPaywall.current = true;
    const retry = () => {
      void presentRevenueCatPaywall();
    };
    try {
      const identified = await ensureIdentified();
      if (!identified) {
        console.warn('[RevenueCat] cannot present paywall before identifying the user');
        showPaywallUnavailableAlert(retry);
        return;
      }

      const ui = getRevenueCatUI();
      if (!ui) {
        console.warn('[RevenueCat] paywall UI unavailable');
        showPaywallUnavailableAlert(retry);
        return;
      }
      const result = await ui.default.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: ENTITLEMENT_ID,
        offering: offerings?.current ?? undefined,
        displayCloseButton: true,
      });
      switch (paywallAction(result)) {
        case 'refresh':
          await refresh();
          break;
        case 'show-unavailable':
          console.warn('[RevenueCat] paywall presentation failed', result);
          showPaywallUnavailableAlert(retry);
          break;
        case 'none':
        default:
          // NOT_PRESENTED: the user already holds the entitlement.
          // CANCELLED: the user dismissed the paywall themselves.
          break;
      }
    } catch (error) {
      console.warn('[RevenueCat] failed to present paywall', error);
      showPaywallUnavailableAlert(retry);
    } finally {
      presentingPaywall.current = false;
    }
  }, [ensureIdentified, offerings?.current, refresh]);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      isPro,
      isTrial,
      expirationDate,
      willRenew,
      managementURL,
      canScan,
      isReady,
      offerings,
      simulation,
      openPaywall: () => {
        void presentRevenueCatPaywall();
      },
      restorePurchases,
      refresh,
      simulate,
    }),
    [
      canScan,
      expirationDate,
      isPro,
      isReady,
      isTrial,
      managementURL,
      offerings,
      presentRevenueCatPaywall,
      refresh,
      restorePurchases,
      simulation,
      simulate,
      willRenew,
    ],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
