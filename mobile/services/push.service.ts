/**
 * Push Notification Service
 *
 * Handles:
 * 1. Requesting permission + getting Expo push token
 * 2. Registering the token with the backend
 * 3. Foreground notification display (show banner while app is open)
 * 4. Notification tap handling (deep-link to the right screen)
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { api } from './api';

// ── Foreground display behaviour ──────────────────────────────
// Show the banner + play sound even when the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Android notification channel ──────────────────────────────
async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Mumbai Fitness Mafia',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#00E5C3',
    sound: 'default',
  });
}

// ── Request permissions + get token ───────────────────────────
export async function registerForPushNotifications(): Promise<string | null> {
  await ensureAndroidChannel();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[push] Permission not granted for push notifications');
    return null;
  }

  // projectId is required to obtain an Expo push token.
  // It is set when you run `eas init` and gets embedded in Constants.expoConfig.extra.eas.projectId
  type ExtraWithEas = { eas?: { projectId?: string } };
  const projectId = (Constants.expoConfig?.extra as ExtraWithEas | undefined)?.eas?.projectId;

  if (!projectId) {
    console.log(
      '[push] No EAS projectId found. ' +
        'Run `eas init` to configure your project, then rebuild. ' +
        'Push notifications will not work in Expo Go without a projectId.',
    );
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch (err) {
    console.error('[push] Failed to get Expo push token:', err);
    return null;
  }
}

// ── Register token with backend ───────────────────────────────
export async function syncPushToken(): Promise<void> {
  const token = await registerForPushNotifications();
  if (!token) return;

  try {
    await api.put('/users/me/push-token', { token });
    console.log('[push] Push token registered with backend');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Stale refresh tokens log out via api client — not worth a red screen in dev.
    if (message.includes('Session expired')) return;
    console.error('[push] Failed to register push token with backend:', err);
  }
}

// ── Deep-link on notification tap ────────────────────────────
export function handleNotificationTap(
  notification: Notifications.Notification | Notifications.NotificationResponse,
) {
  const notif = 'notification' in notification ? notification.notification : notification;
  const data = notif.request.content.data as {
    postId?: string;
    eventId?: string;
    userId?: string;
    conversationId?: string;
  } | null;

  if (!data) return;

  if (data.conversationId) {
    router.push(`/chat/${data.conversationId}`);
  } else if (data.postId) {
    router.push(`/post/${data.postId}`);
  } else if (data.eventId) {
    router.push(`/event/${data.eventId}`);
  } else if (data.userId) {
    router.push(`/profile/${data.userId}`);
  }
}
