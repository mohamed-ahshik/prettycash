import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Purchases, {
  type CustomerInfo,
  type PurchasesOfferings,
  type PurchasesPackage,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { fetchEntitlement, type BackendEntitlement } from '../services/billing';
import { useAuth } from './AuthContext';
import {
  canUseAiScan,
  deriveTrial,
  isScanAllowed,
  type ScanBlockReason,
} from '../lib/subscriptionState';
import { isTestStoreKey, resolveRevenueCatApiKey, type RevenueCatKeyResolution } from '../lib/revenuecatKey';
import { paywallAction } from '../lib/paywallResult';

export type SimulationMode = 'trial' | 'cap' | 'expired' | 'pro' | null;

interface SimulationOverride {
  isPro: boolean;
  isTrialActive: boolean;
  dailyScansUsed: number;
}

interface SubscriptionContextValue {
  isPro: boolean;
  isTrialActive: boolean;
  trialDaysLeft: number;
  trialEndsAt: string | null;
  dailyScansUsed: number;
  dailyLimit: number;
  recordScan: () => void;
  canScan: boolean;
  scanBlockReason: ScanBlockReason;
  offerings: PurchasesOfferings | null;
  loading: boolean;
  unavailableReason: string | null;
  paywallVisible: boolean;
  simulation: SimulationMode;
  openPaywall: () => void;
  openCustomerCenter: () => Promise<void>;
  closePaywall: () => void;
  purchasePackage: (pkg: PurchasesPackage) => Promise<void>;
  restorePurchases: () => Promise<void>;
  refresh: () => Promise<void>;
  simulate: (mode: SimulationMode) => void;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);
const ENTITLEMENT_ID = 'prettycash_pro';

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

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [loading, setLoading] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [simulation, setSimulation] = useState<SimulationMode>(null);
  const [simulationOverride, setSimulationOverride] = useState<SimulationOverride | null>(null);
  const [backendEntitlement, setBackendEntitlement] = useState<BackendEntitlement | null>(null);
  const [localScansUsed, setLocalScansUsed] = useState(0);

  const isPro =
    simulationOverride?.isPro ??
    (customerInfo?.entitlements.active[ENTITLEMENT_ID] != null || Boolean(backendEntitlement?.isPro));
  const trial = deriveTrial(session?.user.created_at, new Date(), isPro);
  const isTrialActive =
    simulationOverride?.isTrialActive ?? backendEntitlement?.inTrial ?? trial.isTrialActive;
  const trialDaysLeft =
    simulation === 'trial' || simulation === 'cap'
      ? 7
      : backendEntitlement?.trialDaysLeft ?? trial.trialDaysLeft;
  const dailyScansUsed =
    simulationOverride?.dailyScansUsed ?? backendEntitlement?.dailyScansUsed ?? localScansUsed;
  const dailyLimit = backendEntitlement?.dailyLimit ?? 3;
  const scanBlockReason = isScanAllowed({ isPro, isTrialActive, dailyScansUsed, dailyLimit });
  const canScan = scanBlockReason === 'allowed';
  const recordScan = useCallback(() => setLocalScansUsed((count) => count + 1), []);

  const refresh = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    try {
      const backend = await fetchEntitlement();
      setBackendEntitlement(backend);
    } catch {
      setBackendEntitlement(null);
    }

    const resolution = getApiKey();
    if (resolution.apiKey === null) {
      setUnavailableReason('RevenueCat is not configured for this platform.');
      setLoading(false);
      return;
    }
    const apiKey = resolution.apiKey;

    if (!__DEV__ && isTestStoreKey(apiKey)) {
      console.warn(
        '[RevenueCat] Using a Test Store key in a release build. ' +
          'Purchases will not be billed. Replace it with a live store key before publishing.',
      );
    }

    try {
      if (configuredApiKey !== apiKey) {
        Purchases.configure({
          apiKey,
          appUserID: session.user.id,
        });
        configuredApiKey = apiKey;
      } else {
        await Purchases.logIn(session.user.id);
      }
      const [info, nextOfferings] = await Promise.all([
        Purchases.getCustomerInfo(),
        Purchases.getOfferings(),
      ]);
      setCustomerInfo(info);
      setOfferings(nextOfferings);
      setUnavailableReason(null);
    } catch (error) {
      setUnavailableReason(
        error instanceof Error ? error.message : 'Subscription products are unavailable.',
      );
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    if (!session?.user) {
      setCustomerInfo(null);
      setOfferings(null);
      setBackendEntitlement(null);
      return;
    }
    void refresh();

    const listener = (info: CustomerInfo) => {
      setCustomerInfo(info);
    };
    if (!getApiKey()) return;
    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [session?.user, refresh]);

  const purchasePackage = useCallback(async (pkg: PurchasesPackage) => {
    const { customerInfo: next } = await Purchases.purchasePackage(pkg);
    setCustomerInfo(next);
    setPaywallVisible(false);
  }, []);

  const restorePurchases = useCallback(async () => {
    const next = await Purchases.restorePurchases();
    setCustomerInfo(next);
  }, []);

  const simulate = useCallback((mode: SimulationMode) => {
    setSimulation(mode);
    if (mode === 'trial') {
      setSimulationOverride({ isPro: false, isTrialActive: true, dailyScansUsed: 0 });
    } else if (mode === 'cap') {
      setSimulationOverride({ isPro: false, isTrialActive: true, dailyScansUsed: 3 });
    } else if (mode === 'expired') {
      setSimulationOverride({ isPro: false, isTrialActive: false, dailyScansUsed: 0 });
    } else if (mode === 'pro') {
      setSimulationOverride({ isPro: true, isTrialActive: false, dailyScansUsed: 99 });
    } else {
      setSimulationOverride(null);
    }
  }, []);

  const presentRevenueCatPaywall = useCallback(async () => {
    try {
      const ui = getRevenueCatUI();
      if (!ui) {
        setPaywallVisible(true);
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
        case 'show-fallback':
          setPaywallVisible(true);
          break;
        case 'none':
        default:
          // NOT_PRESENTED: the user already holds the entitlement.
          // CANCELLED: the user dismissed the paywall themselves.
          break;
      }
    } catch {
      // No RevenueCat paywall is configured, or the store is unavailable.
      // Fall back to the branded local paywall.
      setPaywallVisible(true);
    }
  }, [offerings?.current, refresh]);

  const presentCustomerCenter = useCallback(async () => {
    try {
      const ui = getRevenueCatUI();
      if (!ui) {
        setPaywallVisible(true);
        return;
      }
      await ui.default.presentCustomerCenter();
    } catch {
      setPaywallVisible(true);
    }
  }, []);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      isPro,
      isTrialActive,
      trialDaysLeft,
      trialEndsAt: trial.trialEndsAt,
      dailyScansUsed,
      dailyLimit,
      canScan,
      recordScan,
      scanBlockReason,
      offerings,
      loading,
      unavailableReason,
      paywallVisible,
      simulation,
      openPaywall: () => {
        void presentRevenueCatPaywall();
      },
      openCustomerCenter: presentCustomerCenter,
      closePaywall: () => setPaywallVisible(false),
      purchasePackage,
      restorePurchases,
      refresh,
      simulate,
    }),
    [
      canScan,
      dailyScansUsed,
      recordScan,
      dailyLimit,
      isPro,
      isTrialActive,
      loading,
      offerings,
      paywallVisible,
      presentCustomerCenter,
      presentRevenueCatPaywall,
      purchasePackage,
      refresh,
      restorePurchases,
      scanBlockReason,
      simulation,
      simulate,
      trial.trialEndsAt,
      trialDaysLeft,
      backendEntitlement,
      unavailableReason,
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
