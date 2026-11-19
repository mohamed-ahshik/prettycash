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
import {
  DAILY_TRIAL_SCAN_LIMIT,
  isScanAllowed,
  type ScanBlockReason,
} from '../lib/subscriptionState';
import { isTestStoreKey, resolveRevenueCatApiKey, type RevenueCatKeyResolution } from '../lib/revenuecatKey';
import { paywallAction } from '../lib/paywallResult';
import { PLAY_STORE_SUBSCRIPTIONS_URL } from '../config';

export type SimulationMode = 'trial' | 'cap' | 'expired' | 'pro' | null;

interface SimulationOverride {
  isPro: boolean;
  isTrial: boolean;
  expirationDate: string | null;
  isTrialActive: boolean;
  dailyScansUsed: number;
}

interface SubscriptionContextValue {
  isPro: boolean;
  isTrial: boolean;
  expirationDate: string | null;
  willRenew: boolean;
  managementURL: string;
  isTrialActive: boolean;
  trialDaysLeft: number;
  trialEndsAt: string | null;
  dailyScansUsed: number;
  dailyLimit: number;
  recordScan: () => void;
  canScan: boolean;
  scanBlockReason: ScanBlockReason;
  offerings: PurchasesOfferings | null;
  simulation: SimulationMode;
  openPaywall: () => void;
  openCustomerCenter: () => Promise<void>;
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

function logOutQuietly(): void {
  if (configuredApiKey === null) return;
  try {
    void Purchases.logOut().catch((error) => {
      console.warn('[RevenueCat] failed to log out', error);
    });
  } catch (error) {
    console.warn('[RevenueCat] failed to log out', error);
  }
}

function daysUntil(isoDate: string | null): number {
  if (!isoDate) return 0;
  const time = new Date(isoDate).getTime();
  if (Number.isNaN(time)) return 0;
  return Math.max(0, Math.ceil((time - Date.now()) / DAY_MS));
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
  const [localScansUsed, setLocalScansUsed] = useState(0);
  const presentingPaywall = useRef(false);
  const hadSession = useRef(false);
  const refreshGeneration = useRef(0);

  const state = entitlementState(customerInfo, ENTITLEMENT_ID);
  const isPro =
    simulationOverride?.isPro ??
    (customerInfo ? state.isPro : Boolean(backendEntitlement?.isPro));
  const isTrial = simulationOverride?.isTrial ?? state.isTrial;
  const expirationDate = simulationOverride?.expirationDate ?? state.expirationDate;
  const willRenew = state.willRenew;
  const managementURL = state.managementURL ?? PLAY_STORE_SUBSCRIPTIONS_URL;

  // Legacy trial fields kept until Task 3 rewrites Profile and TabBar.
  const isTrialActive = simulationOverride?.isTrialActive ?? isTrial;
  const trialDaysLeft = isTrialActive ? daysUntil(expirationDate) : 0;
  const trialEndsAt = expirationDate;

  const dailyScansUsed = simulationOverride?.dailyScansUsed ?? localScansUsed;
  const dailyLimit = DAILY_TRIAL_SCAN_LIMIT;
  const scanBlockReason = isScanAllowed({ isPro, isTrialActive, dailyScansUsed, dailyLimit });
  const canScan = scanBlockReason === 'allowed';
  const recordScan = useCallback(() => setLocalScansUsed((count) => count + 1), []);

  const refresh = useCallback(async () => {
    const generation = refreshGeneration.current + 1;
    refreshGeneration.current = generation;

    const apiKey = ensureConfigured();
    const user = session?.user;
    if (!user) return;

    let loginFailed = false;
    if (apiKey !== null) {
      try {
        await Purchases.logIn(user.id);
      } catch (error) {
        loginFailed = true;
        console.warn('[RevenueCat] failed to log in', error);
      }
    }

    // A newer refresh (new session or explicit retry) supersedes this one.
    if (refreshGeneration.current !== generation) return;

    const loadCustomerInfo = apiKey !== null && !loginFailed;
    const loadOfferings = apiKey !== null;

    if (!loadCustomerInfo) {
      // Do not retain a previous user's CustomerInfo; the backend isPro
      // fallback applies until the SDK can identify the current user.
      setCustomerInfo(null);
    }

    const customerInfoPromise: Promise<CustomerInfo | null> = loadCustomerInfo
      ? Purchases.getCustomerInfo()
      : Promise.resolve(null);
    const offeringsPromise: Promise<PurchasesOfferings | null> = loadOfferings
      ? Purchases.getOfferings()
      : Promise.resolve(null);

    const [backendResult, customerInfoResult, offeringsResult] = await Promise.allSettled([
      fetchEntitlement(),
      customerInfoPromise,
      offeringsPromise,
    ]);

    if (refreshGeneration.current !== generation) return;

    if (backendResult.status === 'fulfilled') {
      setBackendEntitlement(backendResult.value);
    } else {
      console.warn('[RevenueCat] failed to load backend entitlement', backendResult.reason);
    }

    if (customerInfoResult.status === 'fulfilled') {
      if (customerInfoResult.value !== null) {
        setCustomerInfo(customerInfoResult.value);
      }
    } else {
      console.warn('[RevenueCat] failed to load customer info', customerInfoResult.reason);
    }

    if (offeringsResult.status === 'fulfilled') {
      if (offeringsResult.value !== null) {
        setOfferings(offeringsResult.value);
      }
    } else {
      console.warn('[RevenueCat] failed to load offerings', offeringsResult.reason);
    }
  }, [session?.user]);

  useEffect(() => {
    const apiKey = ensureConfigured();

    // Auth has not resolved yet. Configuration must still run at startup, but
    // clearing state or logging out now would race session restoration.
    if (loading) return;

    if (!session?.user) {
      refreshGeneration.current += 1;
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

    if (apiKey === null) return;

    const listener = (info: CustomerInfo) => {
      setCustomerInfo(info);
    };
    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [session?.user, loading, refresh]);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    const next = await Purchases.restorePurchases();
    setCustomerInfo(next);
    return next.entitlements.active[ENTITLEMENT_ID] != null;
  }, []);

  const simulate = useCallback((mode: SimulationMode) => {
    setSimulation(mode);
    if (mode === 'trial') {
      setSimulationOverride({
        isPro: true,
        isTrial: true,
        expirationDate: new Date(Date.now() + 7 * DAY_MS).toISOString(),
        isTrialActive: true,
        dailyScansUsed: 0,
      });
    } else if (mode === 'cap') {
      setSimulationOverride({
        isPro: false,
        isTrial: true,
        expirationDate: new Date(Date.now() + 7 * DAY_MS).toISOString(),
        isTrialActive: true,
        dailyScansUsed: 3,
      });
    } else if (mode === 'expired') {
      setSimulationOverride({
        isPro: false,
        isTrial: false,
        expirationDate: null,
        isTrialActive: false,
        dailyScansUsed: 0,
      });
    } else if (mode === 'pro') {
      setSimulationOverride({
        isPro: true,
        isTrial: false,
        expirationDate: null,
        isTrialActive: false,
        dailyScansUsed: 99,
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
  }, [offerings?.current, refresh]);

  const presentCustomerCenter = useCallback(async (): Promise<void> => {
    const retry = () => {
      void presentCustomerCenter();
    };
    try {
      const ui = getRevenueCatUI();
      if (!ui) {
        console.warn('[RevenueCat] customer center UI unavailable');
        showPaywallUnavailableAlert(retry);
        return;
      }
      await ui.default.presentCustomerCenter();
    } catch (error) {
      console.warn('[RevenueCat] failed to present customer center', error);
      showPaywallUnavailableAlert(retry);
    }
  }, []);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      isPro,
      isTrial,
      expirationDate,
      willRenew,
      managementURL,
      isTrialActive,
      trialDaysLeft,
      trialEndsAt,
      dailyScansUsed,
      dailyLimit,
      canScan,
      recordScan,
      scanBlockReason,
      offerings,
      simulation,
      openPaywall: () => {
        void presentRevenueCatPaywall();
      },
      openCustomerCenter: presentCustomerCenter,
      restorePurchases,
      refresh,
      simulate,
    }),
    [
      canScan,
      dailyScansUsed,
      dailyLimit,
      expirationDate,
      isPro,
      isTrial,
      isTrialActive,
      managementURL,
      offerings,
      presentCustomerCenter,
      presentRevenueCatPaywall,
      recordScan,
      refresh,
      restorePurchases,
      scanBlockReason,
      simulation,
      simulate,
      trialDaysLeft,
      trialEndsAt,
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
