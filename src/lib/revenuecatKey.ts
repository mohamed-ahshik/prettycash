/**
 * RevenueCat API key selection.
 *
 * Kept as a pure function so the precedence rules can be tested without
 * mounting the provider or reading `process.env`.
 *
 * Platform keys win over the shared key, so a stale shared value cannot shadow
 * a live per-store key.
 *
 * Test Store keys (`test_...`) are allowed everywhere, including release
 * builds. They complete purchases without billing, which is fine for internal
 * testing but must be replaced with a live `goog_...` / `appl_...` key before a
 * public release. The caller warns when that happens in a release build.
 */

const TEST_STORE_PREFIX = 'test_';

export type RevenueCatKeySource = 'android' | 'ios' | 'shared';

export type RevenueCatKeyResolution =
  | { apiKey: string; source: RevenueCatKeySource }
  | { apiKey: null; reason: 'missing' };

export interface RevenueCatKeyCandidates {
  platform: string;
  sharedKey?: string | null;
  androidKey?: string | null;
  iosKey?: string | null;
}

export function isTestStoreKey(key: string | null | undefined): boolean {
  return typeof key === 'string' && key.trim().startsWith(TEST_STORE_PREFIX);
}

function clean(key: string | null | undefined): string | null {
  const trimmed = key?.trim();
  return trimmed ? trimmed : null;
}

export function resolveRevenueCatApiKey({
  platform,
  sharedKey,
  androidKey,
  iosKey,
}: RevenueCatKeyCandidates): RevenueCatKeyResolution {
  const ordered: Array<{ source: RevenueCatKeySource; key: string | null }> = [
    { source: 'android', key: platform === 'android' ? clean(androidKey) : null },
    { source: 'ios', key: platform === 'ios' ? clean(iosKey) : null },
    { source: 'shared', key: clean(sharedKey) },
  ];

  for (const { source, key } of ordered) {
    if (key) return { apiKey: key, source };
  }

  return { apiKey: null, reason: 'missing' };
}
