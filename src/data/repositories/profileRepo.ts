import { supabase } from '../../lib/supabase';
import { UserProfile } from '../../types';
import { mapProfileRow } from './mappers';

export async function getProfile(): Promise<UserProfile | null> {
  const { data, error } = await supabase.from('profiles').select('*').maybeSingle();
  if (error) throw error;
  return data ? mapProfileRow(data) : null;
}

export async function upsertProfile(profile: UserProfile): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('not authenticated');
  const { error } = await supabase.from('profiles').upsert({
    user_id: userId,
    name: profile.name,
    email: profile.email,
    currency: profile.currency,
    notifications_enabled: profile.notificationsEnabled,
    haptics_enabled: profile.hapticsEnabled,
    theme_preference: profile.themePreference,
    auto_categorize: profile.autoCategorize,
    member_since: profile.memberSince,
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function isSeeded(): Promise<boolean> {
  const { data, error } = await supabase.from('profiles').select('seeded').maybeSingle();
  if (error) throw error;
  return data?.seeded ?? false;
}

export async function setSeeded(seeded: boolean): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('not authenticated');
  const { error } = await supabase.from('profiles').update({ seeded }).eq('user_id', userId);
  if (error) throw error;
}
