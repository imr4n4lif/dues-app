import * as Notifications from 'expo-notifications';

import {
  listReminderRegistry,
  ReminderRegistryRow,
  replaceReminderRegistry,
} from '../database/repositories/reminderRegistry';
import { Due, Person, ReminderConfig } from '../types';
import { DueStatusInfo } from '../models/status';
import { buildGroupContent, buildReminderGroups } from './grouping';
import {
  checkPermissionState,
  ensureAndroidChannel,
  REMINDER_CHANNEL_ID,
} from './permissions';
import { IS_EXPO_GO } from './environment';

/**
 * Rebuild strategy (spec §16/§40): after ANY change that can affect reminders,
 * cancel every app-owned notification and reschedule from current data.
 * This makes duplicates and orphaned notifications structurally impossible.
 */

/** ISO weekday (Mon=1…Sun=7) → expo weekday numbering (Sun=1…Sat=7). */
function toExpoWeekday(isoWeekday: number): number {
  return isoWeekday === 7 ? 1 : isoWeekday + 1;
}

function triggersFor(config: ReminderConfig): Notifications.SchedulableNotificationTriggerInput[] {
  switch (config.frequency) {
    case 'daily':
      return [{ type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: config.hour, minute: config.minute, channelId: REMINDER_CHANNEL_ID }];
    case 'weekly':
      if (!config.weekday) return [];
      return [{
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: toExpoWeekday(config.weekday),
        hour: config.hour,
        minute: config.minute,
        channelId: REMINDER_CHANNEL_ID,
      }];
    case 'monthly':
      if (!config.dayOfMonth) return [];
      return [{
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day: Math.min(config.dayOfMonth, 31),
        hour: config.hour,
        minute: config.minute,
        channelId: REMINDER_CHANNEL_ID,
      }];
    case 'custom': {
      const days = [...new Set(config.weekdays ?? [])];
      return days.map((iso) => ({
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: toExpoWeekday(iso),
        hour: config.hour,
        minute: config.minute,
        channelId: REMINDER_CHANNEL_ID,
      }));
    }
  }
}

export interface ResyncOptions {
  /** Master switch from Settings; when false nothing gets scheduled. */
  notificationsEnabled?: boolean;
}

export interface ResyncResult {
  scheduledGroups: number;
  permissionState: 'granted' | 'denied' | 'undetermined' | 'unsupported';
}

/**
 * Recomputes all reminder notifications from the given dues.
 * Safe to call repeatedly — it fully reconciles state each time.
 *
 * Expo Go cannot schedule local notifications on Android (SDK 53+); in that
 * environment this is a no-op that simply clears the registry.
 */
export async function resyncAllReminders(
  dues: Due[],
  peopleById: Map<string, Person>,
  statusInfoById: Map<string, DueStatusInfo>,
  options: ResyncOptions = {}
): Promise<ResyncResult> {
  if (IS_EXPO_GO) {
    await replaceReminderRegistry([]);
    return { scheduledGroups: 0, permissionState: 'unsupported' };
  }

  const groups =
    options.notificationsEnabled === false
      ? []
      : buildReminderGroups(dues, statusInfoById);
  const permissionState = await checkPermissionState();

  await Notifications.cancelAllScheduledNotificationsAsync();

  const registryRows: ReminderRegistryRow[] = [];

  if (groups.length > 0 && permissionState === 'granted') {
    await ensureAndroidChannel();
    const now = Date.now();

    for (const group of groups) {
      const content = buildGroupContent(
        group,
        new Map(dues.map((d) => [d.id, d])),
        peopleById
      );
      for (const trigger of triggersFor(group.config)) {
        try {
          const id = await Notifications.scheduleNotificationAsync({
            content: { title: content.title, body: content.body },
            trigger,
          });
          registryRows.push({
            id,
            signature: group.signature,
            payload: JSON.stringify({ dueIds: group.dueIds }),
            scheduledAt: now,
          });
        } catch {
          // Scheduling a single trigger failing must not break the rest.
        }
      }
    }
  }

  await replaceReminderRegistry(registryRows);
  return { scheduledGroups: registryRows.length > 0 ? groups.length : 0, permissionState };
}

/** Diagnostic helper: verifies no app notification is missing from the registry. */
export async function findOrphanedNotifications(): Promise<string[]> {
  const [scheduled, registry] = await Promise.all([
    Notifications.getAllScheduledNotificationsAsync(),
    listReminderRegistry(),
  ]);
  const known = new Set(registry.map((r) => r.id));
  return scheduled.map((n) => n.identifier).filter((id) => !known.has(id));
}
