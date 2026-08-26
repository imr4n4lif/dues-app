import { DueStatus, Due, ItemReturnRecord, ItemStatus, MoneyStatus, Payment } from '../types';
import { computeItemSummary, ItemSummary } from './items';
import { computeMoneySummary, MoneySummary } from './money';
import { isPastDay } from '../utils/datetime';

export interface DueStatusInfo {
  status: DueStatus;
  /** True when the due date has passed and the due is not fully settled. */
  overdue: boolean;
  /** Fully paid / fully returned, or explicitly marked as settled by the user. */
  settled: boolean;
  money: MoneySummary | null;
  item: ItemSummary | null;
  remainingMinor: number | null;
  remainingQuantity: number | null;
}

function moneyStatus(summary: MoneySummary, manuallySettled: boolean): MoneyStatus {
  if (summary.remainingMinor <= 0 || manuallySettled) return 'fully_paid';
  if (summary.paidMinor > 0) return 'partially_paid';
  return 'unpaid';
}

function itemStatus(summary: ItemSummary, manuallySettled: boolean): ItemStatus {
  if (summary.status === 'fully_returned' || manuallySettled) return 'fully_returned';
  return summary.status;
}

/**
 * Single source of truth for a due's displayed state. Dashboard, lists,
 * details and filters all read from this so they can never disagree.
 */
export function getDueStatusInfo(
  due: Due,
  payments: Payment[],
  returns: ItemReturnRecord[]
): DueStatusInfo {
  const manuallySettled = due.manuallySettledAt != null;

  if (due.kind === 'money') {
    const summary = computeMoneySummary(due, payments);
    const status = moneyStatus(summary, manuallySettled);
    const settled = status === 'fully_paid';
    return {
      status,
      overdue:
        !settled && summary.remainingMinor > 0 && !due.archived && isPastDay(due.dueDate),
      settled,
      money: summary,
      item: null,
      remainingMinor: summary.remainingMinor,
      remainingQuantity: null,
    };
  }

  const summary = computeItemSummary(due, returns);
  const status = itemStatus(summary, manuallySettled);
  const settled = status === 'fully_returned';
  const hasOutstanding = summary.trackQuantity
    ? (summary.remainingQuantity ?? 0) > 0
    : status !== 'fully_returned';
  return {
    status,
    overdue: !settled && hasOutstanding && !due.archived && isPastDay(due.dueDate),
    settled,
    money: null,
    item: summary,
    remainingMinor: null,
    remainingQuantity: summary.trackQuantity ? summary.remainingQuantity : null,
  };
}

export function isMoneyStatus(status: DueStatus): status is MoneyStatus {
  return (
    status === 'unpaid' || status === 'partially_paid' || status === 'fully_paid'
  );
}

export function isItemStatus(status: DueStatus): status is ItemStatus {
  return (
    status === 'not_returned' ||
    status === 'partially_returned' ||
    status === 'fully_returned'
  );
}
