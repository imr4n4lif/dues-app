import { getCurrency, getDecimalDigits, isSymbolAmbiguous } from '../constants/currencies';
import { fail, ok, Result } from './result';

const MINOR_PER_MAJOR = (digits: number): number => Math.pow(10, digits);

function groupFormat(minor: number, decimalDigits: number): string {
  const value = minor / MINOR_PER_MAJOR(decimalDigits);
  try {
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: decimalDigits,
      maximumFractionDigits: decimalDigits,
    }).format(value);
  } catch {
    return value.toFixed(decimalDigits);
  }
}

function isLetterLikeSymbol(symbol: string): boolean {
  // Symbols like "kr", "CHF", "FCFA" read better as a suffix ("5 000 kr"),
  // while glyph symbols like "$", "৳", "₹" are prefixed ("৳5,000").
  return /^[\p{L}\p{N}.]+$/u.test(symbol) && symbol.length > 1;
}

export interface FormatAmountOptions {
  /** Include the currency symbol/code representation. Default true. */
  withSymbol?: boolean;
  /** Force appending the ISO code even when the symbol is unambiguous. */
  alwaysShowCode?: boolean;
}

/**
 * Centralized money formatting.
 * - Respects the currency's minor units (JPY → ¥1,000, BDT → ৳1,000.00).
 * - Disambiguates shared symbols: `$100 USD` vs `CA$100` per spec §37.
 */
export function formatAmount(
  minor: number,
  currencyCode: string,
  options: FormatAmountOptions = {}
): string {
  const { withSymbol = true, alwaysShowCode = false } = options;
  const info = getCurrency(currencyCode);
  const grouped = groupFormat(minor, info.decimalDigits);

  if (!withSymbol) return grouped;

  const ambiguous = isSymbolAmbiguous(info.code);
  const needsCodeSuffix = ambiguous || alwaysShowCode || !info.symbol;

  if (!info.symbol || isLetterLikeSymbol(info.symbol)) {
    const symbolPart = info.symbol ? `${grouped} ${info.symbol}` : grouped;
    return needsCodeSuffix ? `${symbolPart} ${info.code}` : symbolPart;
  }

  const prefix = `${info.symbol}${grouped}`;
  return needsCodeSuffix ? `${prefix} ${info.code}` : prefix;
}

/** Compact form used in dense lists: "৳5,000" / "$100 USD". */
export function formatAmountCompact(minor: number, currencyCode: string): string {
  return formatAmount(minor, currencyCode, { withSymbol: true });
}

export interface ParsedAmount {
  /** Minor units. */
  minor: number;
}

/**
 * Parses free-form user input into integer minor units for the given currency.
 * Accepts "." or "," as the decimal separator and ignores grouping separators
 * (spaces). Rejects negatives, junk characters and excess precision with a
 * friendly message.
 */
export function parseAmountInput(input: string, currencyCode: string): Result<ParsedAmount> {
  const trimmed = input.trim();
  if (!trimmed) return fail('Enter an amount');

  let cleaned = trimmed.replace(/[\s'\u00A0\u202F]/g, '');

  // If both "." and "," appear, the last one is the decimal separator.
  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');
  if (lastDot !== -1 && lastComma !== -1) {
    const decSep = lastComma > lastDot ? ',' : '.';
    const thouSep = decSep === ',' ? '.' : ',';
    cleaned = cleaned.split(thouSep).join('');
  } else if (lastComma !== -1) {
    // Lone comma: decimal separator only if followed by digits at the end.
    const after = cleaned.slice(lastComma + 1);
    cleaned = /^\d{1,}$/.test(after) ? cleaned.replace(',', '.') : cleaned.replace(/,/g, '');
  }

  if (!/^\d+(\.\d+)?$/.test(cleaned)) {
    return fail('Enter a valid amount using numbers only');
  }
  if (cleaned.startsWith('-')) return fail('Amount cannot be negative');

  const decimalDigits = getDecimalDigits(currencyCode);
  const fracPart = cleaned.split('.')[1] ?? '';
  if (fracPart.length > decimalDigits) {
    const unitName = decimalDigits === 0 ? 'whole amounts only' : `up to ${decimalDigits} decimal place${decimalDigits === 1 ? '' : 's'}`;
    return fail(`${getCurrency(currencyCode).code} supports ${unitName}`);
  }

  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value)) return fail('Enter a valid amount');

  return ok({ minor: Math.round(value * MINOR_PER_MAJOR(decimalDigits)) });
}
