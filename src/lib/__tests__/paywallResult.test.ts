import { paywallAction } from '../paywallResult';

describe('paywallAction', () => {
  it('refreshes entitlement after a purchase', () => {
    expect(paywallAction('PURCHASED')).toBe('refresh');
  });

  it('refreshes entitlement after a restore', () => {
    expect(paywallAction('RESTORED')).toBe('refresh');
  });

  it('reports an unavailable state only on a real error', () => {
    expect(paywallAction('ERROR')).toBe('show-unavailable');
  });

  it('does nothing when the paywall was skipped because the user is already entitled', () => {
    // presentPaywallIfNeeded resolves NOT_PRESENTED when the required entitlement
    // is already active. Showing an upgrade screen here would offer Pro to a
    // customer who already pays for it.
    expect(paywallAction('NOT_PRESENTED')).toBe('none');
  });

  it('does nothing when the user dismisses the paywall', () => {
    expect(paywallAction('CANCELLED')).toBe('none');
  });

  it('does nothing for an unrecognised result', () => {
    expect(paywallAction('SOMETHING_ELSE')).toBe('none');
  });
});
