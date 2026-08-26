import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { IS_EXPO_GO } from './environment';

export type NotificationPermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export const REMINDER_CHANNEL_ID = 'dues-reminders';

let handlerInitialized = false;

/**
 * Must run once at app start so foreground notifications still surface.
 * Skipped entirely in Expo Go — the native module is crippled there and any
 * call only produces console noise.
 */
export function initializeNotificationHandler(): void {
  if (handlerInitialized || IS_EXPO_GO) return;
  handlerInitialized = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function checkPermissionState(): Promise<NotificationPermissionState> {
  if (IS_EXPO_GO) return 'unsupported';
  try {
    const settings = await Notifications.getPermissionsAsync();
    const granted =
      settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    if (granted) return 'granted';
    return settings.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'denied';
  }
}

/**
 * Requests permission when needed. Returns 'granted' only when notifications
 * can actually be scheduled; callers treat anything else as "off" but keep
 * data intact so enabling permission later just works after a resync.
 */
export async function requestPermissionIfNeeded(): Promise<NotificationPermissionState> {
  if (IS_EXPO_GO) return 'unsupported';
  const current = await checkPermissionState();
  if (current === 'granted' || current === 'denied') return current;
  try {
    await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
  } catch {
    return 'denied';
  }
  return checkPermissionState();
}

/**
 * Requests notification permission when the OS hasn't answered yet.
 * Called automatically on first launch — Android 13+ shows the standard
 * "Allow notifications" dialog here.
 */
export async function ensureRuntimePermission(): Promise<NotificationPermissionState> {
  if (IS_EXPO_GO) return 'unsupported';
  return requestPermissionIfNeeded();
}

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android' || IS_EXPO_GO) return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Due reminders',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#4F46E5',
  });
}
