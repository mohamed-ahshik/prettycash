import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Circle, Path } from 'react-native-svg';

jest.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({
    isDark: false,
    colors: {
      expenseText: '#C0392B',
      incomeText: '#1B5E20',
      muted: '#F0F5F3',
      mutedForeground: '#5C6670',
      foreground: '#10231C',
      card: '#FFFFFF',
      border: '#DCE5E0',
    },
  }),
  useThemedStyles: () => ({}),
}));

jest.mock('../../context/CurrencyContext', () => ({
  useCurrency: () => ({ symbol: '$', decimals: 2 }),
}));

jest.mock('../../lib/haptics', () => ({
  hapticSelection: jest.fn(),
}));

jest.mock('../Icon', () => ({
  Icon: () => null,
}));

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    FadeIn: { duration: () => ({}) },
  };
});

import { DonutChart } from '../DonutChart';
import type { TypeBreakdown } from '../../utils/insights';

const expense: TypeBreakdown = { total: 50, items: [] };
const income: TypeBreakdown = { total: 0, items: [] };

function render(drill: 'expense' | 'income' | null) {
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <DonutChart expense={expense} income={income} drill={drill} onDrill={jest.fn()} />,
    );
  });
  return renderer!;
}

it('shows an empty ring when the selected income breakdown has no transactions', () => {
  const renderer = render('income');

  expect(renderer.root.findAllByType(Circle)).toHaveLength(1);
  expect(renderer.root.findAllByType(Path)).toHaveLength(0);
});

it('renders a full ring when only expenses exist', () => {
  const renderer = render(null);

  expect(renderer.root.findAllByType(Circle)).toHaveLength(1);
  expect(renderer.root.findAllByType(Path)).toHaveLength(0);
});
