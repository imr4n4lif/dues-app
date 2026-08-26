import { CURRENCIES } from '../constants/currencies';
import {
  Direction,
  Due,
  ItemReturnRecord,
  Payment,
  Person,
} from '../types';
import { getDueStatusInfo, DueStatusInfo } from './status';
import { nextOccurrence } from './reminders';

export interface CurrencyMoneyTotals {
  currencyCode: string;
  totalMinor: number;
  /** Paid (borrowed) or received (lent). */
  settledMinor: number;
  remainingMinor: number;
  dueCount: number;
}

/**
 * Groups money dues by currency. Different currencies are NEVER combined —
 * every currency keeps its own totals row.
 */
export function aggregateMoneyByCurrency(
  dues: Due[],
  paymentsByDue: Map<string, Payment[]>,
  direction?: Direction
): CurrencyMoneyTotals[] {
  const map = new Map<string, CurrencyMoneyTotals>();
  for (const due of dues) {
    if (due.kind !== 'money' || !due.currencyCode) continue;
    if (direction && due.direction !== direction) continue;
    const info = getDueStatusInfo(due, paymentsByDue.get(due.id) ?? [], []);
    const existing =
      map.get(due.currencyCode) ??
      ({
        currencyCode: due.currencyCode,
        totalMinor: 0,
        settledMinor: 0,
        remainingMinor: 0,
        dueCount: 0,
      } satisfies CurrencyMoneyTotals);
    existing.totalMinor += info.money?.totalMinor ?? 0;
    existing.settledMinor += info.money?.paidMinor ?? 0;
    // A settled due (fully paid or explicitly marked) owes nothing anymore,
    // even when its raw remaining figure is non-zero (manual settlement).
    existing.remainingMinor += info.settled ? 0 : info.remainingMinor ?? 0;
    existing.dueCount += 1;
    map.set(due.currencyCode, existing);
  }
  return [...map.values()].sort(
    (a, b) => b.totalMinor - a.totalMinor || a.currencyCode.localeCompare(b.currencyCode)
  );
}

export interface ItemStatusCounts {
  activeTotal: number;
  notReturned: number;
  partiallyReturned: number;
  fullyReturned: number;
}

export function aggregateItemStatusCounts(
  dues: Due[],
  returnsByDue: Map<string, ItemReturnRecord[]>,
  direction?: Direction
): ItemStatusCounts {
  const counts: ItemStatusCounts = {
    activeTotal: 0,
    notReturned: 0,
    partiallyReturned: 0,
    fullyReturned: 0,
  };
  for (const due of dues) {
    if (due.kind !== 'item' || due.archived) continue;
    if (direction && due.direction !== direction) continue;
    const info = getDueStatusInfo(due, [], returnsByDue.get(due.id) ?? []);
    counts.activeTotal += 1;
    if (info.status === 'not_returned') counts.notReturned += 1;
    else if (info.status === 'partially_returned') counts.partiallyReturned += 1;
    else counts.fullyReturned += 1;
  }
  return counts;
}

export type DueFilterKey =
  | 'all'
  | 'borrowed'
  | 'lent'
  | 'money'
  | 'items'
  | 'active'
  | 'unpaid'
  | 'partially_paid'
  | 'partially_returned'
  | 'fully_settled'
  | 'overdue'
  | 'archived';

export const DUE_FILTER_KEYS: readonly DueFilterKey[] = [
  'all',
  'borrowed',
  'lent',
  'money',
  'items',
  'active',
  'unpaid',
  'partially_paid',
  'partially_returned',
  'fully_settled',
  'overdue',
  'archived',
];

export function matchesFilter(due: Due, info: DueStatusInfo, filter: DueFilterKey): boolean {
  switch (filter) {
    case 'all':
      return !due.archived;
    case 'borrowed':
      return !due.archived && due.direction === 'borrowed';
    case 'lent':
      return !due.archived && due.direction === 'lent';
    case 'money':
      return !due.archived && due.kind === 'money';
    case 'items':
      return !due.archived && due.kind === 'item';
    case 'active':
      return !due.archived && !info.settled;
    case 'unpaid':
      return !due.archived && info.status === 'unpaid';
    case 'partially_paid':
      return !due.archived && info.status === 'partially_paid';
    case 'partially_returned':
      return !due.archived && info.status === 'partially_returned';
    case 'fully_settled':
      return !due.archived && info.settled;
    case 'overdue':
      return !due.archived && info.overdue;
    case 'archived':
      return due.archived;
  }
}

export type DueSortKey =
  | 'newest'
  | 'oldest'
  | 'due_date'
  | 'highest_amount'
  | 'lowest_amount'
  | 'upcoming_reminder'
  | 'person';

export interface SortContext {
  peopleById: Map<string, Person>;
  statusInfoById: Map<string, DueStatusInfo>;
}

/** Stable sort; never mutates the input array. */
export function sortDues(dues: Due[], sort: DueSortKey, ctx: SortContext): Due[] {
  const copy = [...dues];
  const personName = (d: Due): string =>
    ctx.peopleById.get(d.personId)?.name.toLowerCase() ?? '\uFFFF';

  switch (sort) {
    case 'newest':
      copy.sort((a, b) => b.createdAt - a.createdAt);
      break;
    case 'oldest':
      copy.sort((a, b) => a.createdAt - b.createdAt);
      break;
    case 'due_date': {
      // Undated dues sink to the end.
      copy.sort((a, b) => {
        const ad = a.dueDate ?? Number.MAX_SAFE_INTEGER;
        const bd = b.dueDate ?? Number.MAX_SAFE_INTEGER;
        return ad - bd || b.createdAt - a.createdAt;
      });
      break;
    }
    case 'highest_amount':
    case 'lowest_amount': {
      const dir = sort === 'highest_amount' ? -1 : 1;
      // Amounts are only compared within the same currency — never across.
      const currencyRank = new Map(CURRENCIES.map((c, i) => [c.code, i]));
      copy.sort((a, b) => {
        const ac = a.currencyCode ?? '';
        const bc = b.currencyCode ?? '';
        if (ac !== bc) {
          return (currencyRank.get(ac) ?? 999) - (currencyRank.get(bc) ?? 999);
        }
        const aa = a.amountMinor ?? a.quantity ?? 0;
        const bb = b.amountMinor ?? b.quantity ?? 0;
        return dir * (aa - bb) || b.createdAt - a.createdAt;
      });
      break;
    }
    case 'upcoming_reminder': {
      copy.sort((a, b) => {
        const an = a.reminderConfig ? (nextOccurrence(a.reminderConfig) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
        const bn = b.reminderConfig ? (nextOccurrence(b.reminderConfig) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
        return an - bn || b.createdAt - a.createdAt;
      });
      break;
    }
    case 'person':
      copy.sort((a, b) => personName(a).localeCompare(personName(b)) || b.createdAt - a.createdAt);
      break;
  }
  return copy;
}

export interface SearchContext {
  peopleById: Map<string, Person>;
}

/**
 * Offline search across person name, item name, note, description, amount and
 * currency code. Case-insensitive substring matching — fast on in-memory data
 * even with thousands of records.
 */
export function searchDues(dues: Due[], rawQuery: string, ctx: SearchContext): Due[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return dues;
  return dues.filter((due) => {
    if (ctx.peopleById.get(due.personId)?.name.toLowerCase().includes(q)) return true;
    if (due.itemName?.toLowerCase().includes(q)) return true;
    if (due.note?.toLowerCase().includes(q)) return true;
    if (due.itemDescription?.toLowerCase().includes(q)) return true;
    if (due.currencyCode?.toLowerCase().includes(q)) return true;
    if (due.amountMinor != null && String(due.amountMinor).includes(q)) return true;
    return false;
  });
}
