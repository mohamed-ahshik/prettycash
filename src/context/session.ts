import { Session } from '@supabase/supabase-js';
import { SHOW_AUTH_UI } from '../config';
import { supabase } from '../lib/supabase';

export interface InitialSession {
  session: Session | null;
  error: string | null;
}

export async function resolveInitialSession(
  showAuthUI: boolean = SHOW_AUTH_UI,
): Promise<InitialSession> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return { session: data.session, error: null };
  if (showAuthUI) return { session: null, error: null };

  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error) return { session: null, error: error.message };
  return { session: anon.session ?? null, error: null };
}
