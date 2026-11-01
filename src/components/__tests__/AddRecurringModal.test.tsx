import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

jest.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      foreground: '#10231C',
      mutedForeground: '#5C6670',
      muted: '#F0F5F3',
      border: '#DCE5E0',
      background: '#FAFAFA',
      primary: '#00674F',
      secondary: '#DFF0EB',
      primaryForeground: '#FFFFFF',
    },
  }),
  useThemedStyles: () => ({}),
}));

const expenseCategories = [
  {
    id: 'subs',
    name: 'Subscriptions',
    type: 'expense',
    icon: 'credit-card-outline',
    colorBg: '#E8EFFD',
    colorFg: '#3B5BDB',
  },
];

const incomeCategories = [
  {
    id: 'salary',
    name: 'Salary',
    type: 'income',
    icon: 'briefcase-outline',
    colorBg: '#E8F5E9',
    colorFg: '#2E7D32',
  },
];

jest.mock('../../context/CategoriesContext', () => ({
  useCategories: () => ({ expenseCategories, incomeCategories }),
}));

jest.mock('../Icon', () => ({
  Icon: () => null,
}));

jest.mock('../BottomSheet', () => ({
  BottomSheet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { AddRecurringModal } from '../AddRecurringModal';

function visibleText(renderer: TestRenderer.ReactTestRenderer): string {
  return renderer.root
    .findAllByType(Text)
    .map((node) => {
      const children = node.props.children;
      return Array.isArray(children) ? children.join('') : String(children ?? '');
    })
    .join(' | ');
}

function render() {
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <AddRecurringModal visible initialType="expense" onClose={jest.fn()} onSave={jest.fn()} />,
    );
  });
  return renderer!;
}

it('shows the active main categories instead of hardcoded options', () => {
  const text = visibleText(render());

  expect(text).toContain('Subscriptions');
  expect(text).not.toContain('Travel');
});
