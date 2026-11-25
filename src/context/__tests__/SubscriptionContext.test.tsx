import React from 'react';
import { Alert, Pressable, Text } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

const mockAuthState: { session: { user: { id: string } } | null; loading: boolean } = {
  session: { user: { id: 'user-1' } },
  loading: false,
};

const mockFetchEntitlement = jest.fn();
const mockPresentPaywall = jest.fn();
const mockPresentCustomerCenter = jest.fn();

jest.mock('../AuthContext', () => ({
  useAuth: () => mockAuthState,
}));
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    getAppUserID: jest.fn(),
    logIn: jest.fn(),
    logOut: jest.fn(),
    getCustomerInfo: jest.fn(),
    getOfferings: jest.fn(),
    addCustomerInfoUpdateListener: jest.fn(),
    removeCustomerInfoUpdateListener: jest.fn(),
  },
}));
jest.mock('react-native-purchases-ui', () => ({
  __esModule: true,
  default: {
    presentPaywallIfNeeded: (...args: unknown[]) => mockPresentPaywall(...args),
    presentCustomerCenter: (...args: unknown[]) => mockPresentCustomerCenter(...args),
  },
}));
jest.mock('../../services/billing', () => ({
  fetchEntitlement: () => mockFetchEntitlement(),
}));
jest.mock('../../lib/revenuecatKey', () => ({
  resolveRevenueCatApiKey: () => ({ apiKey: 'goog_test', source: 'shared' }),
  isTestStoreKey: () => false,
}));
jest.mock('../../config', () => ({
  PLAY_STORE_SUBSCRIPTIONS_URL:
    'https://play.google.com/store/account/subscriptions?package=com.mohamedahshik.prettycash',
}));

import Purchases from 'react-native-purchases';
import { SubscriptionProvider, useSubscription } from '../SubscriptionContext';

const mockPurchases = Purchases as unknown as {
  configure: jest.Mock;
  getAppUserID: jest.Mock;
  logIn: jest.Mock;
  logOut: jest.Mock;
  getCustomerInfo: jest.Mock;
  getOfferings: jest.Mock;
  addCustomerInfoUpdateListener: jest.Mock;
  removeCustomerInfoUpdateListener: jest.Mock;
};

const customerInfo = {
  entitlements: {
    active: {
      prettycash_pro: {
        isActive: true,
        periodType: 'NORMAL',
        expirationDate: '2026-12-19T00:00:00Z',
        willRenew: true,
      },
    },
  },
  managementURL: 'https://play.google.com/store/account/subscriptions?package=x',
};

function Probe() {
  const { isPro, isTrial, isReady, canScan } = useSubscription();
  return <Text>{`${isPro}:${isTrial}:${isReady}:${canScan}`}</Text>;
}

function PaywallProbe() {
  const { openPaywall } = useSubscription();
  return (
    <Pressable testID="open-paywall" onPress={openPaywall}>
      <Text>open paywall</Text>
    </Pressable>
  );
}

function text(renderer: TestRenderer.ReactTestRenderer): string {
  return renderer.root.findAllByType(Text).map((node) => node.props.children).join(' | ');
}

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function render(node: React.ReactElement): Promise<TestRenderer.ReactTestRenderer> {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(node);
  });
  await flush();
  return renderer;
}

beforeEach(() => {
  mockAuthState.session = { user: { id: 'user-1' } };
  mockAuthState.loading = false;
  mockPurchases.configure.mockClear();
  mockPurchases.getAppUserID.mockReset().mockResolvedValue('anonymous');
  mockPurchases.logIn.mockReset().mockResolvedValue({});
  mockPurchases.logOut.mockReset().mockResolvedValue({});
  mockPurchases.getCustomerInfo.mockReset().mockResolvedValue(customerInfo);
  mockPurchases.getOfferings.mockReset().mockResolvedValue({ current: null, all: {} });
  mockPurchases.addCustomerInfoUpdateListener.mockClear();
  mockPurchases.removeCustomerInfoUpdateListener.mockClear();
  mockFetchEntitlement.mockReset().mockResolvedValue({ isPro: true });
  mockPresentPaywall.mockReset();
  mockPresentCustomerCenter.mockReset();
  jest.spyOn(Alert, 'alert').mockClear();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('identifies the Supabase user and exposes RevenueCat entitlement state', async () => {
  const renderer = await render(
    <SubscriptionProvider>
      <Probe />
    </SubscriptionProvider>,
  );

  expect(mockPurchases.configure).toHaveBeenCalledWith({ apiKey: 'goog_test' });
  expect(mockPurchases.logIn).toHaveBeenCalledWith('user-1');
  expect(mockPurchases.getCustomerInfo).toHaveBeenCalled();
  expect(text(renderer)).toContain('true:false:true:true');
});

it('releases readiness from CustomerInfo without waiting for the backend', async () => {
  let resolveBackend!: (value: { isPro: boolean }) => void;
  mockFetchEntitlement.mockReturnValue(
    new Promise((resolve) => {
      resolveBackend = resolve;
    }),
  );

  const renderer = await render(
    <SubscriptionProvider>
      <Probe />
    </SubscriptionProvider>,
  );

  expect(text(renderer)).toContain('true:false:true:true');

  await act(async () => {
    resolveBackend({ isPro: true });
  });
  await flush();
});

it('waits for the backend fallback when CustomerInfo is unavailable', async () => {
  let resolveBackend!: (value: { isPro: boolean }) => void;
  mockPurchases.getCustomerInfo.mockRejectedValue(new Error('offline'));
  mockFetchEntitlement.mockReturnValue(
    new Promise((resolve) => {
      resolveBackend = resolve;
    }),
  );

  const renderer = await render(
    <SubscriptionProvider>
      <Probe />
    </SubscriptionProvider>,
  );

  expect(text(renderer)).toContain('false:false:false:false');

  await act(async () => {
    resolveBackend({ isPro: true });
  });
  await flush();

  expect(text(renderer)).toContain('true:false:true:true');
});

it('logs out when the session ends', async () => {
  const renderer = await render(
    <SubscriptionProvider>
      <Probe />
    </SubscriptionProvider>,
  );
  expect(mockPurchases.logIn).toHaveBeenCalled();

  mockAuthState.session = null;
  await act(async () => {
    renderer.update(
      <SubscriptionProvider>
        <Probe />
      </SubscriptionProvider>,
    );
  });
  await flush();

  expect(mockPurchases.logOut).toHaveBeenCalled();
});

it('does not present the paywall when the user cannot be identified', async () => {
  mockPurchases.logIn.mockRejectedValue(new Error('offline'));
  mockAuthState.session = { user: { id: 'user-2' } };

  const renderer = await render(
    <SubscriptionProvider>
      <PaywallProbe />
    </SubscriptionProvider>,
  );

  act(() => {
    const button = renderer.root
      .findAllByProps({ testID: 'open-paywall' })
      .find((node) => typeof node.props.onPress === 'function');
    button?.props.onPress();
  });
  await flush();

  expect(mockPresentPaywall).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenCalled();
});
