import { resolveVisionBaseUrl } from '../config';

const STALE = 'http://192.168.85.188:8000/api/v1';
const METRO = '192.168.0.5:8081';

it('derives the backend host from Metro when the env URL is a stale private IP', () => {
  expect(resolveVisionBaseUrl(STALE, METRO, true)).toBe('http://192.168.0.5:8000/api/v1');
});

it('derives the backend host when the env URL is empty', () => {
  expect(resolveVisionBaseUrl('', METRO, true)).toBe('http://192.168.0.5:8000/api/v1');
});

it('keeps a public backend URL in development', () => {
  expect(resolveVisionBaseUrl('https://vision.example.com/api/v1', METRO, true))
    .toBe('https://vision.example.com/api/v1');
});

it('uses the env URL when Metro is behind a public tunnel', () => {
  expect(resolveVisionBaseUrl(STALE, 'c-test.on.expo.app', true)).toBe(STALE);
});

it('uses the env URL in production', () => {
  expect(resolveVisionBaseUrl(STALE, METRO, false)).toBe(STALE);
});

it('handles a hostUri with a scheme', () => {
  expect(resolveVisionBaseUrl(STALE, 'exp://192.168.0.5:8081', true))
    .toBe('http://192.168.0.5:8000/api/v1');
});
