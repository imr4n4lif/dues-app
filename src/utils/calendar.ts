export { startOfDay, isSameCalendarDay as sameCalendarDay } from './datetime';

/** Weekday initials ordered Monday-first for calendar headers. */
export const WEEKDAY_SHORT_LABELS_ORDERED = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function monthTitle(year: number, monthIndex: number): string {
  return `${MONTH_NAMES[monthIndex] ?? ''} ${year}`;
}

/**
 * Builds a month grid of weeks (Monday-first).
 * Cells are day numbers; `null` pads the leading/trailing empty slots.
 */
export function buildMonthMatrix(
  year: number,
  monthIndex: number
): ReadonlyArray<ReadonlyArray<number | null>> {
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  // JS getDay(): Sunday=0 … → Monday-first index:
  const lead = (first.getDay() + 6) % 7;

  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = [];
  for (let i = 0; i < lead; i += 1) week.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    week.push(day);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}
