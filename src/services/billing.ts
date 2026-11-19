import { getVisionConfig } from '../config';
import { supabase } from '../lib/supabase';

export interface BackendEntitlement {
  isPro: boolean;
}

export async function fetchEntitlement(): Promise<BackendEntitlement> {
  const { baseUrl } = getVisionConfig();
  if (!baseUrl) throw new Error('Backend URL is not configured');

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/billing/entitlement`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Entitlement request failed (${response.status})`);
  }
  return (await response.json()) as BackendEntitlement;
}
