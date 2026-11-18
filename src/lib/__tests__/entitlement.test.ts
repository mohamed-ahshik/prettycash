import type { CustomerInfo } from 'react-native-purchases';
import { entitlementState, formatTrialEnd } from '../entitlement';

const ENTITLEMENT_ID = 'prettycash_pro';
const MANAGEMENT_URL =
  'https://play.google.com/store/account/subscriptions?package=x';

function makeCustomerInfo(
  active: Record<string, Record<string, unknown>>,
  managementURL: string | null = MANAGEMENT_URL,
): CustomerInfo {
  return {
    entitlements: { active, all: active },
    managementURL,
  } as unknown as CustomerInfo;
}

const activeInfo = makeCustomerInfo({
  [ENTITLEMENT_ID]: {
    identifier: ENTITLEMENT_ID,
    isActive: true,
    periodType: 'NORMAL',
    expirationDate: '2026-12-19T00:00:00Z',
    willRenew: true,
  },
});

const trialInfo = makeCustomerInfo({
  [ENTITLEMENT_ID]: {
    identifier: ENTITLEMENT_ID,
    isActive: true,
    periodType: 'TRIAL',
    expirationDate: '2026-12-03T00:00:00Z',
    willRenew: true,
  },
});

const inactiveInfo = makeCustomerInfo({});

describe('entitlementState', () => {
  it('maps an active non-trial entitlement', () => {
    expect(entitlementState(activeInfo, ENTITLEMENT_ID)).toEqual({
      isPro: true,
      isTrial: false,
      expirationDate: '2026-12-19T00:00:00Z',
      willRenew: true,
      managementURL: MANAGEMENT_URL,
    });
  });

  it('marks a trial only when periodType is TRIAL', () => {
    expect(entitlementState(trialInfo, ENTITLEMENT_ID).isTrial).toBe(true);
    expect(entitlementState(activeInfo, ENTITLEMENT_ID).isTrial).toBe(false);
  });

  it('returns an inactive state when the entitlement is not active', () => {
    expect(entitlementState(inactiveInfo, ENTITLEMENT_ID)).toEqual({
      isPro: false,
      isTrial: false,
      expirationDate: null,
      willRenew: false,
      managementURL: null,
    });
  });

  it('returns an inactive state for a null customer info', () => {
    expect(entitlementState(null, ENTITLEMENT_ID).isPro).toBe(false);
  });

  it('returns an inactive state for an entitlement id that has no active info', () => {
    expect(entitlementState(activeInfo, 'another_entitlement').isPro).toBe(
      false,
    );
  });
});

describe('formatTrialEnd', () => {
  it('formats an ISO expiration date as a short month and day', () => {
    expect(formatTrialEnd('2026-11-26T12:00:00Z', 'en-US')).toBe('Nov 26');
  });

  it('returns null for a null expiration date', () => {
    expect(formatTrialEnd(null)).toBeNull();
  });

  it('returns null for an invalid expiration date', () => {
    expect(formatTrialEnd('not-a-date', 'en-US')).toBeNull();
  });
});
