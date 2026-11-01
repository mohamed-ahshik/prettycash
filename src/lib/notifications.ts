import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

let currentPushToken: string | null = null;
let handlerConfigured = false;
const PUSH_TOKEN_KEY = 'prettycash.pushToken';

export function configureNotificationHandler() {
  if (handlerConfigured || Platform.OS === 'web') return;
  handlerConfigured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

function getExpoProjectId(): string | null {
  const easConfig = Constants.easConfig as { projectId?: string } | undefined;
  return Constants.expoConfig?.extra?.eas?.projectId ?? easConfig?.projectId ?? null;
}

export async function registerForPushNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;
  configureNotificationHandler();

  const projectId = getExpoProjectId();
  if (!projectId) return;

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Recurring transactions',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const existingPermission = await Notifications.getPermissionsAsync();
  let status = existingPermission.status;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return;

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  currentPushToken = token;
  await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

  const { error } = await supabase.from('push_tokens').upsert(
    {
      user_id: userId,
      expo_push_token: token,
      platform: Platform.OS,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'expo_push_token' },
  );
  if (error) throw error;
}

export async function unregisterPushToken(): Promise<void> {
  const token = currentPushToken ?? (await AsyncStorage.getItem(PUSH_TOKEN_KEY));
  if (!token) return;

  currentPushToken = null;
  await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  await supabase.from('push_tokens').delete().eq('expo_push_token', token);
}

export function getRecurringOccurrenceId(
  response: Notifications.NotificationResponse,
): string | null {
  const data = response.notification.request.content.data as {
    type?: unknown;
    occurrenceId?: unknown;
  };
  if (data?.type !== 'recurring_occurrence' || typeof data.occurrenceId !== 'string') {
    return null;
  }
  return data.occurrenceId;
}
