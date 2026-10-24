import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

jest.mock('../../context/CategoriesContext', () => ({
  useCategories: () => ({
    expenseCategories: [
      { id: 'cat-food', name: 'Food', type: 'expense', notes: '', isUncategorized: false },
    ],
  }),
}));
jest.mock('../../context/MonthContext', () => ({ useMonth: () => ({ setMonth: jest.fn() }) }));
jest.mock('../../context/TransactionsContext', () => ({
  useTransactions: () => ({ addTransaction: jest.fn() }),
}));
jest.mock('../../context/ThemeContext', () => ({ useThemedStyles: () => ({}) }));
jest.mock('../../data/repositories/profileRepo', () => ({
  getProfile: jest.fn().mockResolvedValue({ autoCategorize: true }),
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
  return { __esModule: true, default: Animated, FadeIn: { duration: () => ({}) } };
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
jest.mock('../AnalysisRetryBar', () => {
  const { Text } = require('react-native');
  return {
    AnalysisRetryBar: ({ kind }: { kind: string }) => <Text>{`bar:${kind}`}</Text>,
  };
});

import { AddTransactionSheet } from '../AddTransactionSheet';
import { ReceiptAnalysisError, analyzeReceipt } from '../../services/receiptAnalysis';

it('shows the timeout retry bar without closing the sheet', async () => {
  (analyzeReceipt as jest.Mock).mockRejectedValue(
    new ReceiptAnalysisError('TIMEOUT', 'Receipt analysis timed out.', {
      jobId: 'job-1',
      phase: 'poll',
      retryable: true,
    }),
  );
  const onClose = jest.fn();
  let renderer: TestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = TestRenderer.create(
      <AddTransactionSheet
        visible
        initialImage={{ base64: 'b64', mimeType: 'image/jpeg' }}
        onClose={onClose}
      />,
    );
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });

  const output = JSON.stringify(renderer!.toJSON());
  expect(output).toContain('bar:timeout');
  expect(output).toContain('form:Receipt analysis timed out. (TIMEOUT)');
  expect(onClose).not.toHaveBeenCalled();
});
