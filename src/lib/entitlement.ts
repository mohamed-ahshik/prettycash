/**
 * RevenueCat entitlement state.
 *
 * `CustomerInfo` is the source of truth for Pro access and for whether the
 * user is on a free trial. The app no longer derives a trial from account
 * age, so nothing here reads local storage or starts a timer.
 */

import type { CustomerInfo } from 'react-native-purchases';

export interface EntitlementState {
  isPro: boolean;
  isTrial: boolean;
  expirationDate: string | null;
  willRenew: boolean;
  managementURL: string | null;
}

const INACTIVE: EntitlementState = {
  isPro: false,
  isTrial: false,
  expirationDate: null,
  willRenew: false,
  managementURL: null,
};

export function entitlementState(
  customerInfo: CustomerInfo | null,
  entitlementId: string,
): EntitlementState {
  const info = customerInfo?.entitlements.active[entitlementId];
  if (!info || !info.isActive) return { ...INACTIVE };

  return {
    isPro: true,
    isTrial: info.periodType === 'TRIAL',
    expirationDate: info.expirationDate ?? null,
    willRenew: info.willRenew,
    managementURL: customerInfo.managementURL ?? null,
  };
}

export function formatTrialEnd(
  expirationDate: string | null,
  locale?: string,
): string | null {
  if (!expirationDate) return null;

  const date = new Date(expirationDate);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}
