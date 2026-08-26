import { ReminderConfig } from '../types';

function toIsoWeekday(jsDay: number): number {
  // JS: Sunday=0 … Saturday=6 → ISO: Monday=1 … Sunday=7
  return jsDay === 0 ? 7 : jsDay;
}

function atTime(base: Date, hour: number, minute: number): number {
  const t = new Date(base);
  t.setHours(hour, minute, 0, 0);
  return t.getTime();
}

/**
 * Next local occurrence of a reminder strictly after `from`.
 * Monthly dates beyond a month's length fire on the last day of that month.
 */
export function nextOccurrence(config: ReminderConfig, from: number = Date.now()): number | null {
  const base = new Date(from);

  const candidatesForWeekday = (isoDay: number): number | null => {
    for (let add = 0; add < 8; add += 1) {
      const day = new Date(base);
      day.setDate(day.getDate() + add);
      if (toIsoWeekday(day.getDay()) === isoDay) {
        return atTime(day, config.hour, config.minute);
      }
    }
    return null;
  };

  switch (config.frequency) {
    case 'daily': {
      let candidate = atTime(base, config.hour, config.minute);
      if (candidate <= from) {
        const next = new Date(base);
        next.setDate(next.getDate() + 1);
        candidate = atTime(next, config.hour, config.minute);
      }
      return candidate;
    }
    case 'weekly': {
      if (!config.weekday) return null;
      return candidatesForWeekday(config.weekday);
    }
    case 'monthly': {
      if (!config.dayOfMonth) return null;
      const build = (monthOffset: number): number => {
        const d = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        d.setDate(Math.min(config.dayOfMonth ?? 1, lastDay));
        return atTime(d, config.hour, config.minute);
      };
      const thisMonth = build(0);
      return thisMonth > from ? thisMonth : build(1);
    }
    case 'custom': {
      const days = config.weekdays ?? [];
      if (days.length === 0) return null;
      let best: number | null = null;
      for (const day of days) {
        const candidate = candidatesForWeekday(day);
        if (candidate != null && candidate > from && (best == null || candidate < best)) {
          best = candidate;
        }
      }
      return best;
    }
  }
}
