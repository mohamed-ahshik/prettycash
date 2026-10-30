import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');

export type GoogleSignInResult = 'success' | 'cancelled';

let cachedModule: GoogleSignInModule | null | undefined;

function getNativeModule(): GoogleSignInModule | null {
  if (Platform.OS === 'web') return null;
  if (cachedModule !== undefined) return cachedModule;

  try {
    cachedModule = require('@react-native-google-signin/google-signin') as GoogleSignInModule;
  } catch {
    cachedModule = null;
  }

  return cachedModule;
}

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function getWebClientId(): string | undefined {
  return readEnv('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID') ?? readEnv('GCLOUD_CLIENT_ID');
}

function getIosClientId(): string | undefined {
  return readEnv('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID');
}

export async function signInWithGoogleNative(): Promise<GoogleSignInResult> {
  const google = getNativeModule();
  if (!google) {
    throw new Error(
      'Google sign-in requires a development build. Expo Go is not supported.',
    );
  }

  const webClientId = getWebClientId();
  if (!webClientId) {
    throw new Error(
      'Google sign-in is not configured: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is missing.',
    );
  }

  const iosClientId = getIosClientId();
  if (Platform.OS === 'ios' && !iosClientId) {
    throw new Error(
      'Google sign-in is not configured: EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is missing.',
    );
  }

  google.GoogleSignin.configure({
    webClientId,
    iosClientId,
    scopes: ['profile', 'email'],
  });

  if (Platform.OS === 'android') {
    const hasPlayServices = await google.GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });
    if (!hasPlayServices) {
      throw new Error('Google Play Services is not available on this device.');
    }
  }

  let response;
  try {
    response = await google.GoogleSignin.signIn();
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: unknown }).code === google.statusCodes.SIGN_IN_CANCELLED
    ) {
      return 'cancelled';
    }
    throw error;
  }

  if (response.type === 'cancelled') return 'cancelled';

  const idToken = response.data.idToken;
  if (!idToken) {
    throw new Error('Google did not return an ID token.');
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });
  if (error) throw error;

  return 'success';
}
