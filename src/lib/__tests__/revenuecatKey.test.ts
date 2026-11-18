import { isTestStoreKey, resolveRevenueCatApiKey } from '../revenuecatKey';

const LIVE_ANDROID = 'goog_live_android_key';
const LIVE_IOS = 'appl_live_ios_key';
const TEST_STORE = 'test_BDboonRJTbfsQnfKAeOYxUXQsAW';

describe('isTestStoreKey', () => {
  it('detects Test Store keys by prefix', () => {
    expect(isTestStoreKey(TEST_STORE)).toBe(true);
    expect(isTestStoreKey('  test_leading_space  ')).toBe(true);
    expect(isTestStoreKey(LIVE_ANDROID)).toBe(false);
    expect(isTestStoreKey(LIVE_IOS)).toBe(false);
    expect(isTestStoreKey(null)).toBe(false);
    expect(isTestStoreKey(undefined)).toBe(false);
    expect(isTestStoreKey('')).toBe(false);
  });
});

describe('resolveRevenueCatApiKey', () => {
  it('uses a shared Test Store key', () => {
    expect(
      resolveRevenueCatApiKey({
        platform: 'android',
        sharedKey: TEST_STORE,
      }),
    ).toEqual({ apiKey: TEST_STORE, source: 'shared' });
  });

  it('uses a Test Store key set as a platform key', () => {
    expect(
      resolveRevenueCatApiKey({
        platform: 'android',
        androidKey: TEST_STORE,
      }),
    ).toEqual({ apiKey: TEST_STORE, source: 'android' });
  });

  it('prefers the platform key over the shared key', () => {
    expect(
      resolveRevenueCatApiKey({
        platform: 'android',
        androidKey: LIVE_ANDROID,
        sharedKey: TEST_STORE,
      }),
    ).toEqual({ apiKey: LIVE_ANDROID, source: 'android' });
  });

  it('uses the iOS key only on iOS', () => {
    expect(
      resolveRevenueCatApiKey({
        platform: 'ios',
        iosKey: LIVE_IOS,
        androidKey: LIVE_ANDROID,
      }),
    ).toEqual({ apiKey: LIVE_IOS, source: 'ios' });

    expect(
      resolveRevenueCatApiKey({
        platform: 'android',
        iosKey: LIVE_IOS,
        androidKey: LIVE_ANDROID,
      }),
    ).toEqual({ apiKey: LIVE_ANDROID, source: 'android' });
  });

  it('reports missing when only the other platform has a key', () => {
    expect(
      resolveRevenueCatApiKey({
        platform: 'ios',
        androidKey: LIVE_ANDROID,
      }),
    ).toEqual({ apiKey: null, reason: 'missing' });
  });

  it('reports missing when no key is configured', () => {
    expect(resolveRevenueCatApiKey({ platform: 'android' })).toEqual({
      apiKey: null,
      reason: 'missing',
    });
  });

  it('ignores blank and whitespace-only keys', () => {
    expect(
      resolveRevenueCatApiKey({
        platform: 'android',
        sharedKey: '   ',
        androidKey: '',
      }),
    ).toEqual({ apiKey: null, reason: 'missing' });
  });

  it('trims whitespace from the returned key', () => {
    expect(
      resolveRevenueCatApiKey({
        platform: 'android',
        androidKey: `  ${LIVE_ANDROID}  `,
      }),
    ).toEqual({ apiKey: LIVE_ANDROID, source: 'android' });
  });
});
