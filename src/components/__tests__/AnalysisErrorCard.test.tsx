import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

jest.mock('../../context/ThemeContext', () => ({
  useThemedStyles: () => ({}),
}));

import { AnalysisErrorCard } from '../AnalysisErrorCard';
import type { AnalysisErrorKind } from '../AnalysisErrorCard';

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

function press(renderer: TestRenderer.ReactTestRenderer, testID: string) {
  act(() => {
    renderer.root.findByProps({ testID }).props.onPress();
  });
}

function render(kind: AnalysisErrorKind) {
  const actions: string[] = [];
  const onClose = jest.fn();
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <AnalysisErrorCard
        kind={kind}
        image={image}
        onAction={(action) => actions.push(action)}
        onClose={onClose}
      />,
    );
  });
  return { renderer: renderer!, actions, onClose };
}

it('offers scan, gallery, and manual for a rejected receipt', () => {
  const { renderer, actions } = render('rejected');
  const text = visibleText(renderer);

  expect(text).toContain('Not a receipt');
  expect(text).toContain('Scan again');
  expect(text).toContain('Choose another photo');
  expect(text).not.toContain('Try again');

  press(renderer, 'error-action-scan-again');
  press(renderer, 'error-action-choose-photo');
  press(renderer, 'error-action-enter-manually');
  expect(actions).toEqual(['scan-again', 'choose-photo', 'enter-manually']);
});

it('adds a same-image retry for a failed receipt', () => {
  const { renderer, actions } = render('failed');
  const text = visibleText(renderer);

  expect(text).toContain('Couldn’t read this receipt');
  expect(text).toContain('Try again');
  expect(text).toContain('Scan again');
  expect(text).toContain('Choose another photo');

  press(renderer, 'error-action-try-again');
  expect(actions).toEqual(['try-again']);
});

it('offers keep checking and start over for a timeout', () => {
  const { renderer, actions } = render('timeout');
  const text = visibleText(renderer);

  expect(text).toContain('Still reading');
  press(renderer, 'error-action-keep-checking');
  press(renderer, 'error-action-start-over');
  expect(actions).toEqual(['keep-checking', 'start-over']);
});

it('offers retry actions for upload, enqueue, and poll failures', () => {
  const upload = render('upload');
  expect(visibleText(upload.renderer)).toContain('Couldn’t send receipt');
  press(upload.renderer, 'error-action-retry-upload');
  expect(upload.actions).toEqual(['retry-upload']);

  const enqueue = render('enqueue');
  expect(visibleText(enqueue.renderer)).toContain('Analysis didn’t start');
  press(enqueue.renderer, 'error-action-retry-analysis');
  expect(enqueue.actions).toEqual(['retry-analysis']);

  const poll = render('poll');
  expect(visibleText(poll.renderer)).toContain('Lost connection');
  press(poll.renderer, 'error-action-retry-checking');
  expect(poll.actions).toEqual(['retry-checking']);
});

it('closes with the close button', () => {
  const { renderer, onClose } = render('rejected');
  press(renderer, 'error-close');
  expect(onClose).toHaveBeenCalledTimes(1);
});
