import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import { listDues } from '../database/repositories/dues';
import { listAllPayments } from '../database/repositories/payments';
import { listAllReturns } from '../database/repositories/returns';
import { listPeople } from '../database/repositories/people';
import { loadSettings, getExtraValue, setExtraValue } from '../database/repositories/settings';
import { getDueStatusInfo } from '../models/status';
import { previousOccurrence } from '../models/reminders';
import { formatAmountCompact } from '../utils/money';
import { Due, Person } from '../types';

/**
 * Layer 4 — catch-up delivery.
 *
 * Aggressive OEM skins (Infinix/XOS, Xiaomi/MIUI…) cancel pending alarms when
 * the user swipes an app away. This WorkManager-backed job runs at least every
 * 15 minutes (plus on every app foreground) and reposts any reminder whose
 * trigger time passed without a notification actually being delivered.
 * Deduplication relies on the dueIds payload embedded in every scheduled
 * notification: if a presented notification already covers the occurrence,
 * it is skipped. Worst case on hostile skins = late delivery instead of none.
 */

const CATCH_UP_TASK = 'dues.reminder-catchup';
const LAST_RUN_KEY = 'catchup.lastRunAt';
/** Never scan further back than this — older misses are stale. */
const LOOKBACK_MS = 12 * 60 * 60 * 1000;
/** Native alarm delivery is trusted for this long after the trigger time. */
const DELIVERY_GRACE_MS = 90 * 1000;
const MAX_OCCURRENCE_STEPS = 8;

interface PresentedRef {
  date: number;
  dueIds: string[];
}

function extractDueIds(data: unknown): string[] {
  if (typeof data !== 'object' || data == null) return [];
  const ids = (data as { dueIds?: unknown }).dueIds;
  if (!Array.isArray(ids)) return [];
  return ids.filter((id): id is string => typeof id === 'string');
}

async function collectPresented(): Promise<PresentedRef[]> {
  try {
    const notifications = await Notifications.getPresentedNotificationsAsync();
    return notifications.map((n) => ({
      date: typeof n.date === 'number' ? n.date : 0,
      dueIds: extractDueIds(n.request.content.data),
    }));
  } catch {
    return [];
  }
}

function describeMissedLine(due: Due, person: Person | undefined): string | null {
  const name = person?.name ?? 'Unknown';
  if (due.kind === 'money' && due.amountMinor != null && due.currencyCode) {
    return `${formatAmountCompact(due.amountMinor, due.currencyCode)} ${
      due.direction === 'borrowed' ? 'borrowed from' : 'lent to'
    } ${name}`;
  }
  if (due.itemName) {
    return `${due.itemName} ${due.direction === 'borrowed' ? 'borrowed from' : 'lent to'} ${name}`;
  }
  return null;
}

let defined = false;

/** Idempotent task definition; must run before registration (app start). */
export function defineCatchUpTask(): void {
  if (defined) return;
  defined = true;
  TaskManager.defineTask(CATCH_UP_TASK, async () => {
    try {
      await runReminderCatchUp();
      return true;
    } catch {
      return false;
    }
  });
}

export async function registerCatchUpTask(): Promise<void> {
  defineCatchUpTask();
  try {
    await BackgroundTask.registerTaskAsync(CATCH_UP_TASK, {
      minimumInterval: 15 * 60, // minutes; OS treats it as a minimum delay
    });
  } catch {
    // Registration can fail on restricted devices; foreground catch-up still runs.
  }
}

/**
 * Detects reminders whose trigger time passed since the last run without a
 * delivered notification and posts one consolidated catch-up alert.
 * Returns how many dues were caught up.
 */
export async function runReminderCatchUp(): Promise<number> {
  const settings = await loadSettings();
  if (!settings.notificationsEnabled) return 0;

  const now = Date.now();
  const lastRunRaw = await getExtraValue(LAST_RUN_KEY);
  const lastRun = lastRunRaw != null ? Number.parseInt(lastRunRaw, 10) : 0;
  const lowerBound = Math.max(
    Number.isFinite(lastRun) ? lastRun : 0,
    now - LOOKBACK_MS
  );

  const [dues, people, payments, returns] = await Promise.all([
    listDues(),
    listPeople(),
    listAllPayments(),
    listAllReturns(),
  ]);
  const peopleById = new Map(people.map((p) => [p.id, p]));
  const paymentsByDueId = new Map<string, typeof payments>();
  for (const p of payments) {
    const list = paymentsByDueId.get(p.dueId);
    if (list) list.push(p);
    else paymentsByDueId.set(p.dueId, [p]);
  }
  const returnsByDueId = new Map<string, typeof returns>();
  for (const r of returns) {
    const list = returnsByDueId.get(r.dueId);
    if (list) list.push(r);
    else returnsByDueId.set(r.dueId, [r]);
  }

  // Only consider occurrences that had time to be delivered natively.
  const deliveryCutoff = now - DELIVERY_GRACE_MS;
  if (deliveryCutoff <= lowerBound) return 0;

  const presented = await collectPresented();
  const missedDues: Due[] = [];

  for (const due of dues) {
    if (due.archived || !due.reminderConfig) continue;
    const info = getDueStatusInfo(
      due,
      paymentsByDueId.get(due.id) ?? [],
      returnsByDueId.get(due.id) ?? []
    );
    if (info.settled) continue;

    let missed = false;
    let cursor = now;
    for (let step = 0; step < MAX_OCCURRENCE_STEPS; step += 1) {
      const t = previousOccurrence(due.reminderConfig, cursor);
      if (t == null || t <= lowerBound || t > deliveryCutoff) break;
      cursor = t;

      const covered = presented.some(
        (p) => p.dueIds.includes(due.id) && p.date >= t - DELIVERY_GRACE_MS
      );
      if (!covered) {
        missed = true;
        break;
      }
    }
    if (missed) missedDues.push(due);
  }

  if (missedDues.length === 0) {
    await setExtraValue(LAST_RUN_KEY, String(now));
    return 0;
  }

  const lines: string[] = [];
  for (const due of missedDues.slice(0, 5)) {
    const line = describeMissedLine(due, peopleById.get(due.personId));
    if (line) lines.push(`• ${line}`);
  }
  const overflow = missedDues.length - lines.length;
  if (overflow > 0) lines.push(`…and ${overflow} more`);

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title:
          missedDues.length === 1
            ? 'Missed due reminder'
            : `${missedDues.length} reminders were missed`,
        body: lines.join('\n'),
        data: { dueIds: missedDues.map((d) => d.id), catchup: true },
      },
      trigger: null, // immediate
    });
  } catch {
    return 0;
  }

  await setExtraValue(LAST_RUN_KEY, String(now));
  return missedDues.length;
}
