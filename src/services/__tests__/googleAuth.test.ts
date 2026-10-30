jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  },
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithIdToken: jest.fn(),
    },
  },
}));

import { Platform } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase } from '../../lib/supabase';
import { signInWithGoogleNative } from '../googleAuth';

const mockGoogleSignin = GoogleSignin as unknown as {
  configure: jest.Mock;
  hasPlayServices: jest.Mock;
  signIn: jest.Mock;
};
const mockSignInWithIdToken = supabase.auth.signInWithIdToken as jest.Mock;
const originalPlatform = Platform.OS;
const originalEnv = { ...process.env };

function setWebClientId() {
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'web-client-id.apps.googleusercontent.com';
}

function setIosClientId() {
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = 'ios-client-id.apps.googleusercontent.com';
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv };
  setWebClientId();
  setIosClientId();
  mockGoogleSignin.hasPlayServices.mockResolvedValue(true);
  mockGoogleSignin.signIn.mockResolvedValue({
    type: 'success',
    data: { idToken: 'google-id-token' },
  });
  mockSignInWithIdToken.mockResolvedValue({ error: null });
});

afterEach(() => {
  Platform.OS = originalPlatform;
});

it('configures Google and exchanges the native ID token with Supabase', async () => {
  await expect(signInWithGoogleNative()).resolves.toBe('success');

  expect(mockGoogleSignin.configure).toHaveBeenCalledWith(
    expect.objectContaining({
      webClientId: 'web-client-id.apps.googleusercontent.com',
      iosClientId: 'ios-client-id.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
    }),
  );
  expect(mockSignInWithIdToken).toHaveBeenCalledWith({
    provider: 'google',
    token: 'google-id-token',
  });
});

it('returns cancelled without calling Supabase when the sheet is dismissed', async () => {
  mockGoogleSignin.signIn.mockResolvedValue({ type: 'cancelled', data: null });

  await expect(signInWithGoogleNative()).resolves.toBe('cancelled');
  expect(mockSignInWithIdToken).not.toHaveBeenCalled();
});

it('rejects when Google does not return an ID token', async () => {
  mockGoogleSignin.signIn.mockResolvedValue({
    type: 'success',
    data: { idToken: null },
  });

  await expect(signInWithGoogleNative()).rejects.toThrow(
    'Google did not return an ID token.',
  );
  expect(mockSignInWithIdToken).not.toHaveBeenCalled();
});

it('rejects when the web client ID is missing', async () => {
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = '';
  process.env.GCLOUD_CLIENT_ID = '';

  await expect(signInWithGoogleNative()).rejects.toThrow(
    'Google sign-in is not configured: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is missing.',
  );
  expect(mockGoogleSignin.configure).not.toHaveBeenCalled();
});

it('rejects when the iOS client ID is missing on iOS', async () => {
  Platform.OS = 'ios';
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = '';

  await expect(signInWithGoogleNative()).rejects.toThrow(
    'Google sign-in is not configured: EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is missing.',
  );
});

it('checks Play Services on Android before signing in', async () => {
  Platform.OS = 'android';

  await expect(signInWithGoogleNative()).resolves.toBe('success');
  expect(mockGoogleSignin.hasPlayServices).toHaveBeenCalledWith({
    showPlayServicesUpdateDialog: true,
  });
});

it('rejects when Play Services is unavailable on Android', async () => {
  Platform.OS = 'android';
  mockGoogleSignin.hasPlayServices.mockResolvedValue(false);

  await expect(signInWithGoogleNative()).rejects.toThrow(
    'Google Play Services is not available on this device.',
  );
  expect(mockGoogleSignin.signIn).not.toHaveBeenCalled();
});

it('propagates Supabase sign-in errors', async () => {
  const supabaseError = new Error('Invalid Google token');
  mockSignInWithIdToken.mockResolvedValue({ error: supabaseError });

  await expect(signInWithGoogleNative()).rejects.toThrow('Invalid Google token');
});
