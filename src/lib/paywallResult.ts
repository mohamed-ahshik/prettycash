/**
 * Maps a RevenueCat paywall presentation result onto the app's next action.
 *
 * The distinction that matters is `NOT_PRESENTED`: `presentPaywallIfNeeded`
 * resolves that value when the user already holds the required entitlement, so
 * it must not be treated as a failure. Treating it as one shows an upgrade
 * screen to a customer who is already paying.
 *
 * `ERROR` maps to the `show-unavailable` action because there is no local
 * fallback paywall. The context, not this helper, logs the error and shows the
 * temporarily-unavailable alert.
 */

export type PaywallAction = 'refresh' | 'show-unavailable' | 'none';

export function paywallAction(result: string): PaywallAction {
  switch (result) {
    case 'PURCHASED':
    case 'RESTORED':
      return 'refresh';
    case 'ERROR':
      return 'show-unavailable';
    case 'NOT_PRESENTED':
    case 'CANCELLED':
    default:
      return 'none';
  }
}
