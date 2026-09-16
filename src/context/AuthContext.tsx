import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
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

  const retrySession = useCallback(async () => {
    setLoading(true);
    const { session: next, error } = await resolveInitialSession();
    setSession(next);
    setAuthError(error);
    setLoading(false);
  }, []);

  useEffect(() => {
    retrySession();
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'INITIAL_SESSION') return;
      setSession(s);
      setAuthError(null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [retrySession]);

  const signInWithProvider = async (provider: 'google' | 'facebook') => {
    if (Platform.OS === 'web') {
      const { error } = await supabase.auth.signInWithOAuth({ provider });
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
