const DAY_MS = 24 * 60 * 60 * 1000;

export const WEEKDAY_LABELS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export function startOfDay(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function startOfToday(): number {
  return startOfDay(Date.now());
}

export function isPastDay(timestamp: number | null | undefined): boolean {
  if (timestamp == null) return false;
  return startOfDay(timestamp) < startOfToday();
}

export function isSameCalendarDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b);
}

function formatter(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat(undefined, options);
  } catch {
    return new Intl.DateTimeFormat('en-US', options);
  }
}

/** e.g. "September 10, 2026" */
export function formatFullDate(timestamp: number): string {
  return formatter({ year: 'numeric', month: 'long', day: 'numeric' }).format(timestamp);
}

/** e.g. "Sep 10" or "Sep 10, 2027" when not the current year */
export function formatDateShort(timestamp: number): string {
  const sameYear = new Date(timestamp).getFullYear() === new Date().getFullYear();
  return formatter(
    sameYear
      ? { month: 'short', day: 'numeric' }
      : { month: 'short', day: 'numeric', year: 'numeric' }
  ).format(timestamp);
}

/** e.g. "Aug 25, 2026, 8:00 PM" */
export function formatDateTime(timestamp: number): string {
  return formatter({
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp);
}

/** e.g. "8:00 PM" */
export function formatTimeOfDay(hour: number, minute: number): string {
  const ref = new Date();
  ref.setHours(hour, minute, 0, 0);
  return formatter({ hour: 'numeric', minute: '2-digit' }).format(ref.getTime());
}

export function weekdayLabel(isoWeekday: number): string {
  return WEEKDAY_LABELS[isoWeekday - 1] ?? '';
}

export function weekdayShortLabel(isoWeekday: number): string {
  const label = weekdayLabel(isoWeekday);
  return label.slice(0, 3);
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/** Human description matching the spec examples ("Every Monday at 8:00 PM"). */
export function describeReminderTime(config: {
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  hour: number;
  minute: number;
  weekday?: number;
  dayOfMonth?: number;
  weekdays?: number[];
}): string {
  const time = formatTimeOfDay(config.hour, config.minute);
  switch (config.frequency) {
    case 'daily':
      return `Every day at ${time}`;
    case 'weekly':
      return config.weekday ? `Every ${weekdayLabel(config.weekday)} at ${time}` : `Weekly at ${time}`;
    case 'monthly':
      return config.dayOfMonth ? `On the ${ordinal(config.dayOfMonth)} at ${time}` : `Monthly at ${time}`;
    case 'custom': {
      const days = [...(config.weekdays ?? [])].sort((a, b) => a - b);
      if (days.length === 0) return `Custom reminder at ${time}`;
      if (days.length === 7) return `Every day at ${time}`;
      const label = days.map(weekdayShortLabel).join(', ');
      return `${label} at ${time}`;
    }
  }
}

/** Adds days to a timestamp preserving local time-of-day. */
export function addDays(timestamp: number, days: number): number {
  return timestamp + days * DAY_MS;
}
