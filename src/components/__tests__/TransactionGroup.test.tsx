import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

jest.mock('../../context/ThemeContext', () => ({
  useThemedStyles: () => ({}),
  useTheme: () => ({ colors: { mutedForeground: '#888' } }),
}));
jest.mock('../../context/CurrencyContext', () => ({
  useCurrency: () => ({ symbol: '$', decimals: 2 }),
}));
jest.mock('../Icon', () => ({
  Icon: () => null,
}));
jest.mock('../TransactionRow', () => {
  const { Text } = require('react-native');
  return {
    TransactionRow: ({ transaction }: { transaction: { name: string } }) => (
      <Text>{transaction.name}</Text>
    ),
  };
});

import { TransactionGroup } from '../TransactionGroup';
import { Icon } from '../Icon';
import type { TransactionGroup as TransactionGroupType } from '../../types';

const group: TransactionGroupType = {
  label: 'Today',
  total: -42.3,
  transactions: [
    {
      id: 't1',
      name: 'Coffee',
      date: '2026-11-19',
      time: '08:30',
      categoryId: 'cat-food',
      type: 'expense',
      amount: 3.5,
      icon: 'coffee',
    },
    {
      id: 't2',
      name: 'Groceries',
      date: '2026-11-19',
      time: '18:10',
      categoryId: 'cat-food',
      type: 'expense',
      amount: 38.8,
      icon: 'cart',
    },
  ],
};

// react-test-renderer matches both the Text composite and its host node with
// findAllByProps, so scope the lookup to Text components to count rendered text.
function findAllText(root: TestRenderer.ReactTestInstance, value: string) {
  return root.findAllByType(Text).filter((node) => node.props.children === value);
}

function render(expanded: boolean) {
  const onToggle = jest.fn();
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <TransactionGroup group={group} expanded={expanded} onToggle={onToggle} />,
    );
  });
  return { root: renderer!.root, onToggle };
}

// react-test-renderer cannot match React Native's memoized Pressable by type,
// so find the composite header through its accessibility role.
function header(root: TestRenderer.ReactTestInstance) {
  const [node] = root.findAll(
    (candidate) =>
      candidate.props.accessibilityRole === 'button' &&
      typeof candidate.props.onPress === 'function' &&
      typeof candidate.type !== 'string',
  );
  return node;
}

function pressHeader(root: TestRenderer.ReactTestInstance) {
  act(() => {
    header(root).props.onPress();
  });
}

it('shows the label, net total, and chevron but no rows when collapsed', () => {
  const { root } = render(false);

  expect(findAllText(root, 'Today')).toHaveLength(1);
  expect(findAllText(root, '-$42.30')).toHaveLength(1);
  expect(findAllText(root, 'Coffee')).toHaveLength(0);

  expect(header(root).props.accessibilityRole).toBe('button');
  expect(header(root).props.accessibilityState).toEqual({ expanded: false });
  expect(root.findByType(Icon).props.name).toBe('chevron-down');
});

it('shows the rows and an up chevron when expanded', () => {
  const { root } = render(true);

  expect(findAllText(root, 'Today')).toHaveLength(1);
  expect(findAllText(root, '-$42.30')).toHaveLength(1);
  expect(findAllText(root, 'Coffee')).toHaveLength(1);
  expect(findAllText(root, 'Groceries')).toHaveLength(1);

  expect(header(root).props.accessibilityState).toEqual({ expanded: true });
  expect(root.findByType(Icon).props.name).toBe('chevron-up');
});

it('calls onToggle when the header is pressed', () => {
  const { root, onToggle } = render(false);

  pressHeader(root);

  expect(onToggle).toHaveBeenCalledTimes(1);
});
