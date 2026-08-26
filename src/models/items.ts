import { Due, ItemReturnRecord, ItemStatus } from '../types';

export interface ItemSummary {
  trackQuantity: boolean;
  /** Original quantity when tracking quantities; otherwise null. */
  quantityTotal: number | null;
  /** Sum of quantity-based returns; always 0 for non-quantity items. */
  returnedQuantity: number;
  /** Null for non-quantity items — they use status-based tracking instead. */
  remainingQuantity: number | null;
  status: ItemStatus;
}

/**
 * Quantity items: remaining = original − Σ(returned); fully returned when
 * Σ(returned) ≥ original.
 * Non-quantity items: status comes from the most recent status record
 * ('partial' → partially returned, 'full' → fully returned). Deleting a
 * history record naturally reverts to the previous state.
 */
export function computeItemSummary(due: Due, allReturns: ItemReturnRecord[]): ItemSummary {
  const records = allReturns.filter((r) => r.dueId === due.id);

  if (due.kind !== 'item') {
    return {
      trackQuantity: false,
      quantityTotal: null,
      returnedQuantity: 0,
      remainingQuantity: null,
      status: 'not_returned',
    };
  }

  if (due.trackQuantity) {
    const total = due.quantity ?? 0;
    const returned = records
      .filter((r) => r.kind === 'quantity')
      .reduce((sum, r) => sum + (r.quantity ?? 0), 0);
    const remaining = Math.max(total - returned, 0);
    return {
      trackQuantity: true,
      quantityTotal: total,
      returnedQuantity: returned,
      remainingQuantity: remaining,
      status: returned <= 0 ? 'not_returned' : remaining === 0 ? 'fully_returned' : 'partially_returned',
    };
  }

  const statusRecords = records
    .filter((r) => r.kind === 'status')
    .sort((a, b) => b.returnedAt - a.returnedAt);
  const latest = statusRecords[0];
  return {
    trackQuantity: false,
    quantityTotal: null,
    returnedQuantity: 0,
    remainingQuantity: null,
    status:
      latest?.status === 'full'
        ? 'fully_returned'
        : latest?.status === 'partial'
          ? 'partially_returned'
          : 'not_returned',
  };
}

/** Max quantity that may be recorded in a single new return. */
export function maxReturnableQuantity(summary: ItemSummary): number {
  return summary.remainingQuantity ?? 0;
}
