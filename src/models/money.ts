import { Due, Payment } from '../types';

export interface MoneySummary {
  totalMinor: number;
  paidMinor: number;
  remainingMinor: number;
}

/** paidAmount = Σ(payments); remaining = total − paid. Integer math throughout. */
export function computeMoneySummary(due: Due, payments: Payment[]): MoneySummary {
  const totalMinor = due.amountMinor ?? 0;
  const paidMinor = payments.reduce((sum, p) => sum + p.amountMinor, 0);
  return {
    totalMinor,
    paidMinor,
    remainingMinor: Math.max(totalMinor - paidMinor, 0),
  };
}

/** A payment is only valid inside its parent due's remaining headroom and currency. */
export function isValidPayment(
  due: Due,
  existingPayments: Payment[],
  newAmountMinor: number
): { valid: boolean; reason?: string } {
  if (!due.currencyCode) return { valid: false, reason: 'Due has no currency' };
  if (!Number.isInteger(newAmountMinor) || newAmountMinor <= 0) {
    return { valid: false, reason: 'Payment must be greater than zero' };
  }
  const { remainingMinor } = computeMoneySummary(due, existingPayments);
  if (newAmountMinor > remainingMinor) {
    return { valid: false, reason: 'Payment exceeds the remaining amount' };
  }
  return { valid: true };
}
