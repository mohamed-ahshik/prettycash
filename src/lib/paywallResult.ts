/**
 * Maps a RevenueCat paywall presentation result onto the app's next action.
 *
 * The distinction that matters is `NOT_PRESENTED`: `presentPaywallIfNeeded`
 * resolves that value when the user already holds the required entitlement, so
 * it must not be treated as a failure. Treating it as one shows an upgrade
 * screen to a customer who is already paying.
 */

export type PaywallAction = 'refresh' | 'show-fallback' | 'none';

export function paywallAction(result: string): PaywallAction {
  switch (result) {
    case 'PURCHASED':
    case 'RESTORED':
      return 'refresh';
    case 'ERROR':
      return 'show-fallback';
    case 'NOT_PRESENTED':
    case 'CANCELLED':
    default:
      return 'none';
  }
}
