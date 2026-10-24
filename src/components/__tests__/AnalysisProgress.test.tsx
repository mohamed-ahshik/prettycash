import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

jest.mock('../../context/ThemeContext', () => ({
  useThemedStyles: () => ({}),
}));
jest.mock('react-native-reanimated', () => ({
  useReducedMotion: () => true,
}));

import { AnalysisProgress } from '../AnalysisProgress';

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

function render(stage: 'sending' | 'reading' | 'finishing', slowWait = false, reconnecting = false) {
  const onCancel = jest.fn();
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <AnalysisProgress
        image={image}
        stage={stage}
        slowWait={slowWait}
        reconnecting={reconnecting}
        onCancel={onCancel}
      />,
    );
  });
  return { renderer: renderer!, onCancel };
}

it('renders the three stages and marks the active stage', () => {
  const { renderer } = render('reading');
  const text = visibleText(renderer);

  expect(text).toContain('Reading your receipt');
  expect(text).toContain('Sending receipt');
  expect(text).toContain('Reading receipt');
  expect(text).toContain('Finishing up');
  expect(renderer.root.findByProps({ testID: 'analysis-stage-sending-done' })).toBeTruthy();
  expect(renderer.root.findByProps({ testID: 'analysis-stage-reading-active' })).toBeTruthy();
  expect(renderer.root.findByProps({ testID: 'analysis-stage-finishing-pending' })).toBeTruthy();
});

it('changes the pill and hint after the slow-wait threshold', () => {
  const { renderer } = render('finishing', true);
  const text = visibleText(renderer);

  expect(text).toContain('Taking longer');
  expect(text).toContain('This is taking a little longer than usual.');
  expect(renderer.root.findByProps({ testID: 'analysis-stage-finishing-active' })).toBeTruthy();
});

it('shows the reconnect note and calls cancel', () => {
  const { renderer, onCancel } = render('reading', false, true);
  expect(visibleText(renderer)).toContain('Connection lost — retrying…');

  act(() => {
    renderer.root.findByProps({ testID: 'analysis-cancel' }).props.onPress();
  });
  expect(onCancel).toHaveBeenCalledTimes(1);
});
