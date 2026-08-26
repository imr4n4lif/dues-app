import { formatAmountCompact } from '../utils/money';
import { Due, Person, ReminderConfig } from '../types';
import { DueStatusInfo } from '../models/status';

/** Max dues listed inside a single grouped notification body. */
const MAX_LINES = 5;

/**
 * Canonical grouping key. Reminders with identical signatures fire at the same
 * moment and are merged into ONE notification (spec §16).
 */
export function signatureOf(config: ReminderConfig): string {
  const weekdays = config.weekdays ? [...config.weekdays].sort((a, b) => a - b).join('-') : '';
  return [
    config.frequency,
    config.hour,
    config.minute,
    config.weekday ?? '',
    config.dayOfMonth ?? '',
    weekdays,
  ].join('|');
}

export interface ReminderGroup {
  signature: string;
  config: ReminderConfig;
  dueIds: string[];
}

/**
 * Collects reminders that should currently be scheduled:
 * active (non-archived), not settled, with a reminder and an existing person.
 */
export function buildReminderGroups(
  dues: Due[],
  statusInfoById: Map<string, DueStatusInfo>
): ReminderGroup[] {
  const map = new Map<string, ReminderGroup>();
  for (const due of dues) {
    if (due.archived || !due.reminderConfig) continue;
    const info = statusInfoById.get(due.id);
    if (!info || info.settled) continue; // settled dues stop reminding
    const signature = signatureOf(due.reminderConfig);
    const group = map.get(signature) ?? {
      signature,
      config: due.reminderConfig,
      dueIds: [],
    };
    group.dueIds.push(due.id);
    map.set(signature, group);
  }
  return [...map.values()];
}

function describeDueLine(due: Due, person: Person | undefined): string | null {
  const name = person?.name ?? 'Unknown';
  if (due.kind === 'money') {
    if (due.amountMinor == null || !due.currencyCode) return null;
    return `${formatAmountCompact(due.amountMinor, due.currencyCode)} ${
      due.direction === 'borrowed' ? 'borrowed from' : 'lent to'
    } ${name}`;
  }
  if (!due.itemName) return null;
  return `${due.itemName} ${due.direction === 'borrowed' ? 'borrowed from' : 'lent to'} ${name}`;
}

export function buildGroupContent(
  group: ReminderGroup,
  duesById: Map<string, Due>,
  peopleById: Map<string, Person>
): { title: string; body: string } {
  const lines: string[] = [];
  for (const id of group.dueIds.slice(0, MAX_LINES)) {
    const due = duesById.get(id);
    if (!due) continue;
    const line = describeDueLine(due, peopleById.get(due.personId));
    if (line) lines.push(`• ${line}`);
  }
  const overflow = group.dueIds.length - lines.length;
  if (overflow > 0) lines.push(`…and ${overflow} more`);

  return {
    title: group.dueIds.length === 1 ? 'Due reminder' : `You have ${group.dueIds.length} dues to check`,
    body:
      lines.length > 0
        ? lines.join('\n')
        : 'Time to review your dues.',
  };
}
