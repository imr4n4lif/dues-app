import { parseAmountInput } from '../utils/money';
import { fail, ok, Result } from '../utils/result';
import { Due, Payment, ReminderConfig } from '../types';
import { computeMoneySummary } from '../models/money';

export const MAX_NAME_LENGTH = 60;
export const MAX_TEXT_LENGTH = 500;

export function validatePersonName(raw: string): Result<string> {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (!name) return fail('Enter a name');
  if (name.length > MAX_NAME_LENGTH) return fail(`Name must be under ${MAX_NAME_LENGTH} characters`);
  return ok(name);
}

export function validateCategoryName(
  raw: string,
  existingNamesLower: Set<string>
): Result<string> {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (!name) return fail('Enter a category name');
  if (name.length > MAX_NAME_LENGTH) return fail('Category name is too long');
  if (existingNamesLower.has(name.toLowerCase())) return fail('A category with this name already exists');
  return ok(name);
}

export function validateAmountText(text: string, currencyCode: string): string | null {
  const result = parseAmountInput(text, currencyCode);
  return result.ok ? null : result.error;
}

/** Parses the amount field for a money due. */
export function parseDueAmount(text: string, currencyCode: string): Result<number> {
  const result = parseAmountInput(text, currencyCode);
  if (!result.ok) return result;
  return ok(result.value.minor);
}

export function validateQuantityText(text: string): string | null {
  const t = text.trim();
  if (!t) return 'Enter a quantity';
  if (!/^\d+$/.test(t)) return 'Quantity must be a whole number';
  const n = Number.parseInt(t, 10);
  if (!Number.isFinite(n) || n <= 0) return 'Quantity must be at least 1';
  if (n > 1_000_000) return 'Quantity is too large';
  return null;
}

export function parseQuantityInput(text: string): Result<number> {
  const error = validateQuantityText(text);
  if (error) return fail(error);
  return ok(Number.parseInt(text.trim(), 10));
}

/** Payment validation against remaining headroom of its parent due. */
export function validatePaymentText(
  text: string,
  due: Due,
  payments: Payment[]
): { minor?: number; error?: string } {
  if (!due.currencyCode) return { error: 'This due has no currency' };
  const parsed = parseAmountInput(text, due.currencyCode);
  if (!parsed.ok) return { error: parsed.error };
  const { remainingMinor } = computeMoneySummary(due, payments);
  if (parsed.value.minor > remainingMinor) {
    return { error: 'Payment exceeds the remaining amount' };
  }
  return { minor: parsed.value.minor };
}

export function validateReturnQuantityText(text: string, maxRemaining: number): { quantity?: number; error?: string } {
  const parsed = parseQuantityInput(text);
  if (!parsed.ok) return { error: parsed.error };
  if (parsed.value > maxRemaining) {
    return { error: maxRemaining === 0 ? 'Nothing left to return' : `Cannot return more than ${maxRemaining}` };
  }
  return { quantity: parsed.value };
}

export function validateNoteText(raw: string | null | undefined): Result<string | null> {
  if (raw == null) return ok(null);
  const trimmed = raw.trim();
  if (trimmed.length > MAX_TEXT_LENGTH) return fail(`Note must be under ${MAX_TEXT_LENGTH} characters`);
  return ok(trimmed || null);
}

export interface ReminderDraftLike {
  frequency: ReminderConfig['frequency'];
  hour: number;
  minute: number;
  weekday?: number;
  dayOfMonth?: number;
  weekdays?: number[];
}

export function validateReminderConfig(config: ReminderDraftLike): string | null {
  if (!Number.isInteger(config.hour) || config.hour < 0 || config.hour > 23) return 'Pick a valid time';
  if (!Number.isInteger(config.minute) || config.minute < 0 || config.minute > 59) return 'Pick a valid time';
  switch (config.frequency) {
    case 'daily':
      return null;
    case 'weekly':
      if (!config.weekday || config.weekday < 1 || config.weekday > 7) return 'Pick a day of the week';
      return null;
    case 'monthly':
      if (!config.dayOfMonth || config.dayOfMonth < 1 || config.dayOfMonth > 31) {
        return 'Pick a day of the month';
      }
      return null;
    case 'custom':
      if (!config.weekdays?.length) return 'Pick at least one day';
      return null;
  }
}
