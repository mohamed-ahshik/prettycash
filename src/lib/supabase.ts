import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const webStorage = {
  getItem: async (key: string) => {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  },
};

export const secureStorageAdapter = Platform.OS === 'web' ? webStorage : AsyncStorage;

export function getSupabaseUrl(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
}

export function getSupabaseAnonKey(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
}

export const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
  auth: {
    storage: secureStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
