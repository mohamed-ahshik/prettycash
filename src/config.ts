import Constants from 'expo-constants';

function isTruthy(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1';
}

export function resolveShowAuthUI(value: unknown, isDev: boolean = __DEV__): boolean {
  if (!isDev) return true;
  return !isTruthy(value);
}

const extra = Constants.expoConfig?.extra as { devLoginOff?: unknown } | undefined;
const configuredDevLoginOff = process.env.EXPO_PUBLIC_DEV_LOGIN_OFF ?? extra?.devLoginOff;

export const SHOW_AUTH_UI = resolveShowAuthUI(configuredDevLoginOff);

const PRIVATE_HOST = /^(localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

function hostFromUri(uri: string | null | undefined): string | null {
  if (!uri) return null;
  const withoutScheme = uri.replace(/^[a-z]+:\/\//i, '');
  return withoutScheme.split(':')[0].split('/')[0] || null;
}

export function resolveVisionBaseUrl(
  envUrl: string,
  hostUri: string | null,
  isDev: boolean,
): string {
  const metroHost = hostFromUri(hostUri);
  if (!isDev || !metroHost || !PRIVATE_HOST.test(metroHost)) {
    return envUrl;
  }
  const envHost = hostFromUri(envUrl);
  if (envHost && !PRIVATE_HOST.test(envHost)) {
    return envUrl;
  }
  return `http://${metroHost}:8000/api/v1`;
}

export function getVisionConfig() {
  const envUrl = process.env.EXPO_PUBLIC_VISION_BASE_URL ?? '';
  return {
    baseUrl: resolveVisionBaseUrl(envUrl, Constants.expoConfig?.hostUri ?? null, __DEV__),
    apiKey: process.env.EXPO_PUBLIC_VISION_API_KEY ?? '',
  };
}
