import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import { posthog } from '../lib/posthog';
import { supabase } from '../lib/supabase';
import { signInWithGoogleNative } from '../services/googleAuth';
import { resolveInitialSession } from './session';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  authError: string | null;
  retrySession: () => Promise<void>;
  signInWithProvider: (provider: 'google' | 'facebook') => Promise<void>;
  signInWithEmailOtp: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const posthogDistinctIdRef = useRef<string | null>(null);

  const syncPostHogIdentity = useCallback((nextSession: Session | null) => {
    const user = nextSession?.user;

    if (!user) {
      posthog?.reset();
      posthogDistinctIdRef.current = null;
      return;
    }

    if (posthogDistinctIdRef.current === user.id) return;

    const personProperties: Record<string, string> = {};
    if (user.email) personProperties.email = user.email;
    const displayName = user.user_metadata?.full_name ?? user.user_metadata?.name;
    if (typeof displayName === 'string') personProperties.name = displayName;

    posthog?.identify(user.id, { $set: personProperties });
    posthogDistinctIdRef.current = user.id;
  }, []);

  const retrySession = useCallback(async () => {
    setLoading(true);
    try {
      const { session: next, error } = await resolveInitialSession();
      syncPostHogIdentity(next);
      setSession(next);
      setAuthError(error);
    } catch (e) {
      syncPostHogIdentity(null);
      setSession(null);
      setAuthError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [syncPostHogIdentity]);

  useEffect(() => {
    retrySession();
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'INITIAL_SESSION') return;
      syncPostHogIdentity(s);
      setSession(s);
      setAuthError(null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [retrySession, syncPostHogIdentity]);

  const signInWithProvider = async (provider: 'google' | 'facebook') => {
    if (provider === 'google' && Platform.OS !== 'web') {
      await signInWithGoogleNative();
      return;
    }

    if (Platform.OS === 'web') {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
      return;
    }
    const redirectTo = makeRedirectUri({ scheme: 'prettycash', path: 'auth/callback' });
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data?.url) return;
    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (res.type === 'success') {
      const url = new URL(res.url);
      const code = url.searchParams.get('code');
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
      }
    }
  };

  const signInWithEmailOtp = async (email: string) => {
    const redirectTo =
      Platform.OS === 'web'
        ? window.location.origin
        : makeRedirectUri({ scheme: 'prettycash', path: 'auth/callback' });
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true, emailRedirectTo: redirectTo },
    });
    if (error) throw error;
  };

  useEffect(() => {
    let active = true;

    const handleUrl = async (url: string) => {
      if (!url) return;
      try {
        const parsed = new URL(url);
        const params = new URLSearchParams(parsed.hash.replace(/^#/, '') || parsed.search);
        const errorDescription = params.get('error_description') ?? params.get('error');
        if (errorDescription) {
          if (active) setAuthError(errorDescription);
          return;
        }
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error && active) setAuthError(error.message);
          return;
        }
        const code = params.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error && active) setAuthError(error.message);
        }
      } catch (e) {
        if (active) setAuthError(e instanceof Error ? e.message : String(e));
      }
    };

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });
    void Linking.getInitialURL().then((url) => {
      if (url) void handleUrl(url);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        authError,
        signInWithProvider,
        signInWithEmailOtp,
        signOut,
        retrySession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
