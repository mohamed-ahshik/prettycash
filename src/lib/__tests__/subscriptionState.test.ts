import {
  canUseAiScan,
  deriveTrial,
  isScanAllowed,
} from '../subscriptionState';

describe('deriveTrial', () => {
  const created = new Date('2026-11-01T10:00:00Z');

  it('starts with 7 days left and expires after day 7', () => {
    expect(deriveTrial(created, new Date('2026-11-01T10:00:00Z'), false)).toMatchObject({
      isTrialActive: true,
      trialDaysLeft: 7,
    });
    expect(deriveTrial(created, new Date('2026-11-04T10:00:00Z'), false)).toMatchObject({
      isTrialActive: true,
      trialDaysLeft: 4,
    });
    expect(deriveTrial(created, new Date('2026-11-08T10:00:00Z'), false)).toMatchObject({
      isTrialActive: false,
      trialDaysLeft: 0,
    });
  });

  it('does not grant a trial to Pro users', () => {
    expect(deriveTrial(created, new Date('2026-11-02T10:00:00Z'), true)).toMatchObject({
      isTrialActive: false,
      trialDaysLeft: 0,
    });
  });

  it('handles a missing creation date safely', () => {
    expect(deriveTrial(undefined, new Date(), false)).toMatchObject({
      isTrialActive: false,
      trialDaysLeft: 0,
    });
  });
});

describe('canUseAiScan', () => {
  it('allows Pro users without a daily limit', () => {
    expect(canUseAiScan({ isPro: true, isTrialActive: false, dailyScansUsed: 99 })).toBe(true);
  });

  it('allows a trial user below 3 scans and blocks at the cap', () => {
    expect(canUseAiScan({ isPro: false, isTrialActive: true, dailyScansUsed: 2 })).toBe(true);
    expect(canUseAiScan({ isPro: false, isTrialActive: true, dailyScansUsed: 3 })).toBe(false);
  });

  it('blocks expired trial users', () => {
    expect(canUseAiScan({ isPro: false, isTrialActive: false, dailyScansUsed: 0 })).toBe(false);
  });
});

describe('isScanAllowed', () => {
  it('returns the reason for a blocked scan', () => {
    expect(isScanAllowed({ isPro: false, isTrialActive: true, dailyScansUsed: 3 })).toBe(
      'daily_trial_limit',
    );
    expect(isScanAllowed({ isPro: false, isTrialActive: false, dailyScansUsed: 0 })).toBe(
      'subscription_required',
    );
  });
});
