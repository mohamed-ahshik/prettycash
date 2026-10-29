import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import { posthog } from '../lib/posthog';
import { supabase } from '../lib/supabase';
import { resolveInitialSession } from './session';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  authError: string | null;
  retrySession: () => Promise<void>;
  signInWithProvider: (provider: 'google' | 'facebook') => Promise<void>;
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
    if (Platform.OS === 'web') {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
      return;
    }
    const redirectTo = makeRedirectUri();
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

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, loading, authError, signInWithProvider, signOut, retrySession }}
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
