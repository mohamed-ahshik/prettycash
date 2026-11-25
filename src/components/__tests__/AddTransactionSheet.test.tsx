import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

let mockAction = 'retry-checking';
const mockSubscription = { isPro: true, openPaywall: jest.fn() };

jest.mock('../../context/CategoriesContext', () => ({
  useCategories: () => ({
    expenseCategories: [
      { id: 'cat-food', name: 'Food', type: 'expense', notes: '', isUncategorized: false },
    ],
  }),
}));
jest.mock('../../context/MonthContext', () => ({ useMonth: () => ({ setMonth: jest.fn() }) }));
jest.mock('../../context/SubscriptionContext', () => ({
  useSubscription: () => mockSubscription,
}));
jest.mock('../../context/TransactionsContext', () => ({
  useTransactions: () => ({ addTransaction: jest.fn() }),
}));
jest.mock('../../context/ThemeContext', () => ({ useThemedStyles: () => ({}) }));
jest.mock('../../data/repositories/profileRepo', () => ({
  getProfile: jest.fn().mockResolvedValue({ autoCategorize: false }),
}));
jest.mock('../../data/repositories/storageRepo', () => ({
  uploadReceipt: jest.fn().mockResolvedValue('user/capture.jpg'),
}));
jest.mock('../../lib/haptics', () => ({ hapticSuccess: jest.fn() }));
jest.mock('../../services/receiptAnalysis', () => {
  const actual = jest.requireActual('../../services/receiptAnalysis');
  return {
    ...actual,
    analyzeReceipt: jest.fn(),
    resumeReceiptAnalysis: jest.fn(),
  };
});
jest.mock('react-native-reanimated', () => {
  const { Animated } = require('react-native');
  return {
    __esModule: true,
    default: Animated,
    FadeIn: { duration: () => ({}) },
    useReducedMotion: () => true,
  };
});
jest.mock('../BottomSheet', () => {
  const { View } = require('react-native');
  return {
    BottomSheet: ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
      visible ? <View>{children}</View> : null,
  };
});
jest.mock('../TransactionForm', () => {
  const { Text } = require('react-native');
  return {
    TransactionForm: ({ error }: { error?: string }) => <Text>{`form:${error ?? ''}`}</Text>,
  };
});
jest.mock('../AnalysisProgress', () => {
  const { Text } = require('react-native');
  return {
    AnalysisProgress: ({
      stage,
      slowWait,
      reconnecting,
    }: {
      stage: string;
      slowWait: boolean;
      reconnecting: boolean;
    }) => <Text>{`progress:${stage}:${slowWait}:${reconnecting}`}</Text>,
  };
});

import { AddTransactionSheet } from '../AddTransactionSheet';
import {
  ReceiptAnalysisError,
  analyzeReceipt,
  resumeReceiptAnalysis,
} from '../../services/receiptAnalysis';
import { uploadReceipt } from '../../data/repositories/storageRepo';

const Sheet = AddTransactionSheet as unknown as React.ComponentType<any>;
const image = { base64: 'b64', mimeType: 'image/jpeg' };

function visibleText(renderer: TestRenderer.ReactTestRenderer): string {
  return renderer.root
    .findAllByType(Text)
    .map((node) => {
      const children = node.props.children;
      return Array.isArray(children) ? children.join('') : String(children ?? '');
    })
    .join(' | ');
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function renderSheet() {
  const onClose = jest.fn();
  const onRetake = jest.fn();
  const onChoosePhoto = jest.fn();
  let renderer: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <Sheet
        visible
        initialImage={image}
        onClose={onClose}
        onRetake={onRetake}
        onChoosePhoto={onChoosePhoto}
      />,
    );
  });
  await flush();
  return { renderer: renderer!, onClose, onRetake, onChoosePhoto };
}

function pressErrorAction(renderer: TestRenderer.ReactTestRenderer) {
  act(() => {
    renderer.root.findByProps({ testID: `error-action-${mockAction}` }).props.onPress();
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  mockAction = 'retry-checking';
  mockSubscription.isPro = true;
  mockSubscription.openPaywall.mockClear();
  (analyzeReceipt as jest.Mock).mockReset();
  (resumeReceiptAnalysis as jest.Mock).mockReset();
  (uploadReceipt as jest.Mock).mockResolvedValue('user/capture.jpg');
});

afterEach(() => {
  jest.useRealTimers();
});

it('moves sending to reading to finishing and slow-wait', async () => {
  (analyzeReceipt as jest.Mock).mockImplementation((_base64, _mime, options) => {
    options.onJobId?.('job-1');
    return new Promise(() => {});
  });

  const { renderer } = await renderSheet();
  expect(visibleText(renderer)).toContain('progress:reading:false:false');

  await act(async () => {
    jest.advanceTimersByTime(6000);
  });
  expect(visibleText(renderer)).toContain('progress:finishing:false:false');

  await act(async () => {
    jest.advanceTimersByTime(9000);
  });
  expect(visibleText(renderer)).toContain('progress:finishing:true:false');
});

it('opens the form after completion', async () => {
  (analyzeReceipt as jest.Mock).mockImplementation((_base64, _mime, options) => {
    options.onJobId?.('job-1');
    return Promise.resolve({
      draft: { merchant: 'Cafe', amount: 9.5, note: '', items: [] },
      raw: {},
    });
  });

  const { renderer } = await renderSheet();
  expect(visibleText(renderer)).toContain('form:');
});

it('keeps rejected and failed receipts on the error card', async () => {
  (analyzeReceipt as jest.Mock).mockRejectedValueOnce(
    new ReceiptAnalysisError('NOT_A_RECEIPT', 'not a receipt', {
      jobId: 'job-1',
      phase: 'poll',
      retryable: false,
    }),
  );
  const rejected = await renderSheet();
  expect(visibleText(rejected.renderer)).toContain('Not a receipt');
  expect(visibleText(rejected.renderer)).not.toContain('form:');

  (analyzeReceipt as jest.Mock).mockRejectedValueOnce(
    new ReceiptAnalysisError('FAILED', 'failed', {
      jobId: 'job-2',
      phase: 'poll',
      retryable: false,
    }),
  );
  const failed = await renderSheet();
  expect(visibleText(failed.renderer)).toContain('Couldn’t read this receipt');
  expect(visibleText(failed.renderer)).not.toContain('form:');
});

it('retries a failed job with a new request id', async () => {
  const requestIds: string[] = [];
  (analyzeReceipt as jest.Mock).mockImplementation((_base64, _mime, options) => {
    requestIds.push(options.requestId);
    return Promise.reject(
      new ReceiptAnalysisError('FAILED', 'failed', {
        jobId: `job-${requestIds.length}`,
        phase: 'poll',
        retryable: false,
      }),
    );
  });

  const { renderer } = await renderSheet();
  expect(visibleText(renderer)).toContain('Couldn’t read this receipt');

  mockAction = 'try-again';
  pressErrorAction(renderer);
  await flush();

  expect(requestIds).toHaveLength(2);
  expect(requestIds[1]).not.toBe(requestIds[0]);
});

it('resumes at the preserved stage and shows slow-wait', async () => {
  let rejectAnalysis: ((reason?: unknown) => void) | undefined;
  (analyzeReceipt as jest.Mock).mockImplementation((_base64, _mime, options) => {
    options.onJobId?.('job-1');
    return new Promise((_resolve, reject) => {
      rejectAnalysis = reject;
    });
  });

  const { renderer } = await renderSheet();
  await act(async () => {
    jest.advanceTimersByTime(10000);
  });
  await act(async () => {
    rejectAnalysis?.(
      new ReceiptAnalysisError('NETWORK', 'lost', {
        jobId: 'job-1',
        phase: 'poll',
        retryable: true,
      }),
    );
  });
  await flush();
  expect(visibleText(renderer)).toContain('Lost connection');

  (resumeReceiptAnalysis as jest.Mock).mockImplementation(() => new Promise(() => {}));
  mockAction = 'retry-checking';
  pressErrorAction(renderer);
  await flush();
  expect(visibleText(renderer)).toContain('progress:finishing:false:false');

  await act(async () => {
    jest.advanceTimersByTime(5000);
  });
  expect(visibleText(renderer)).toContain('progress:finishing:true:false');
});

it('routes upload errors and replacement actions', async () => {
  (uploadReceipt as jest.Mock).mockRejectedValueOnce(new Error('offline'));
  const upload = await renderSheet();
  expect(visibleText(upload.renderer)).toContain('Couldn’t send receipt');

  mockAction = 'choose-photo';
  pressErrorAction(upload.renderer);
  expect(upload.onChoosePhoto).toHaveBeenCalledTimes(1);

  (analyzeReceipt as jest.Mock).mockRejectedValueOnce(
    new ReceiptAnalysisError('NOT_A_RECEIPT', 'not a receipt', {
      jobId: 'job-3',
      phase: 'poll',
      retryable: false,
    }),
  );
  const rejected = await renderSheet();
  mockAction = 'scan-again';
  pressErrorAction(rejected.renderer);
  expect(rejected.onRetake).toHaveBeenCalledTimes(1);

  mockAction = 'enter-manually';
  pressErrorAction(rejected.renderer);
  await flush();
  expect(visibleText(rejected.renderer)).toContain('form:');
});

it('shows the activating message when a Pro purchase has not reached the backend', async () => {
  mockSubscription.isPro = true;
  (analyzeReceipt as jest.Mock).mockRejectedValueOnce(
    new ReceiptAnalysisError('SUBSCRIPTION_REQUIRED', 'subscription required'),
  );

  const { renderer } = await renderSheet();
  expect(visibleText(renderer)).toContain('Subscription is activating');
  expect(
    renderer.root.findByProps({ testID: 'error-action-try-again' }),
  ).toBeTruthy();
  expect(visibleText(renderer)).not.toContain('form:');
});

it('offers the paywall when a free user scans', async () => {
  mockSubscription.isPro = false;
  (analyzeReceipt as jest.Mock).mockRejectedValueOnce(
    new ReceiptAnalysisError('SUBSCRIPTION_REQUIRED', 'subscription required'),
  );

  const { renderer } = await renderSheet();
  expect(visibleText(renderer)).toContain('PrettyCash Pro required');
  expect(visibleText(renderer)).not.toContain('form:');

  mockAction = 'upgrade';
  pressErrorAction(renderer);
  expect(mockSubscription.openPaywall).toHaveBeenCalledTimes(1);
});

it('switches the free-user error card to activating after a purchase', async () => {
  mockSubscription.isPro = false;
  (analyzeReceipt as jest.Mock).mockRejectedValueOnce(
    new ReceiptAnalysisError('SUBSCRIPTION_REQUIRED', 'subscription required'),
  );

  const { renderer, onClose, onRetake, onChoosePhoto } = await renderSheet();
  expect(visibleText(renderer)).toContain('PrettyCash Pro required');

  mockSubscription.isPro = true;
  await act(async () => {
    renderer.update(
      <Sheet
        visible
        initialImage={image}
        onClose={onClose}
        onRetake={onRetake}
        onChoosePhoto={onChoosePhoto}
      />,
    );
  });
  await flush();

  expect(visibleText(renderer)).toContain('Subscription is activating');
});
