import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

jest.mock('../TransactionGroup', () => {
  const { Pressable, Text } = require('react-native');
  return {
    TransactionGroup: ({
      group,
      expanded,
      onToggle,
    }: {
      group: { label: string };
      expanded: boolean;
      onToggle: () => void;
    }) => (
      <Pressable accessibilityRole="button" onPress={onToggle}>
        <Text>{`${group.label}:${expanded ? 'open' : 'closed'}`}</Text>
      </Pressable>
    ),
  };
});

import { DailyTransactionList } from '../DailyTransactionList';
import type { TransactionGroup as TransactionGroupType } from '../../types';

const groups: TransactionGroupType[] = [
  { label: 'Today', total: 0, transactions: [] },
  { label: 'Yesterday', total: 0, transactions: [] },
];

function texts(root: TestRenderer.ReactTestInstance): string[] {
  return root.findAllByType(Text).map((node) => {
    const children = node.props.children;
    return Array.isArray(children) ? children.join('') : String(children ?? '');
  });
}

// react-test-renderer cannot match React Native's memoized Pressable by type,
// so collect the composite group headers through their accessibility role.
function headers(root: TestRenderer.ReactTestInstance) {
  return root.findAll(
    (node) =>
      node.props.accessibilityRole === 'button' &&
      typeof node.props.onPress === 'function' &&
      typeof node.type !== 'string',
  );
}

function pressSecond(root: TestRenderer.ReactTestInstance) {
  act(() => {
    headers(root)[1].props.onPress();
  });
}

function render(initialGroups: TransactionGroupType[] = groups) {
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(<DailyTransactionList groups={initialGroups} />);
  });
  return renderer!;
}

it('starts with the newest date open and keeps only one date open', () => {
  const renderer = render();

  expect(texts(renderer.root)).toEqual(['Today:open', 'Yesterday:closed']);

  pressSecond(renderer.root);
  expect(texts(renderer.root)).toEqual(['Today:closed', 'Yesterday:open']);

  pressSecond(renderer.root);
  expect(texts(renderer.root)).toEqual(['Today:closed', 'Yesterday:closed']);
});

it('falls back to the newest remaining date when the open date disappears', () => {
  const renderer = render();

  act(() => {
    renderer.update(<DailyTransactionList groups={[groups[1]]} />);
  });

  expect(texts(renderer.root)).toEqual(['Yesterday:open']);
});
