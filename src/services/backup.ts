import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import Constants from 'expo-constants';
import * as Sharing from 'expo-sharing';

import { getDatabase } from '../database/db';

import { listCategories, insertCategoryExact } from '../database/repositories/categories';
import { insertDue, listDues } from '../database/repositories/dues';
import { insertPayment, listAllPayments } from '../database/repositories/payments';
import {
  insertItemReturn,
  listAllReturns,
} from '../database/repositories/returns';
import {
  loadRawSettingsMap,
  restoreRawSettings,
} from '../database/repositories/settings';
import { insertPerson, listPeople } from '../database/repositories/people';
import { parseReminderConfig } from '../database/mappers';
import { isKnownCurrency } from '../constants/currencies';
import {
  Category,
  Direction,
  Due,
  DueKind,
  ItemReturnRecord,
  NonQuantityReturnMark,
  Payment,
  Person,
} from '../types';
import { ok, Result } from '../utils/result';

export const BACKUP_FORMAT = 'dues-backup';
export const BACKUP_VERSION = 1;

export interface BackupPayload {
  format: string;
  version: number;
  exportedAt: number;
  appVersion?: string;
  people: unknown[];
  categories: unknown[];
  dues: unknown[];
  payments: unknown[];
  returns: unknown[];
  settings?: Record<string, unknown>;
}

export interface NormalizedBackup {
  meta: { exportedAt: number; appVersion?: string };
  people: Person[];
  categories: Category[];
  dues: Due[];
  payments: Payment[];
  returns: ItemReturnRecord[];
  settings: Record<string, string>;
}

export interface MergeReport {
  peopleAdded: number;
  categoriesAdded: number;
  duesAdded: number;
  paymentsAdded: number;
  returnsAdded: number;
  skipped: number;
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

function timestampSlug(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

/** Builds a complete, versioned snapshot of every entity plus settings. */
export async function buildBackupPayload(): Promise<BackupPayload> {
  const [people, categories, dues, payments, returns, rawSettings] = await Promise.all([
    listPeople(),
    listCategories(),
    listDues({ includeDeleted: false }),
    listAllPayments(),
    listAllReturns(),
    loadRawSettingsMap(),
  ]);
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    appVersion: Constants.expoConfig?.version,
    people,
    categories,
    dues,
    payments,
    returns,
    settings: rawSettings,
  };
}

export async function exportBackupToFile(): Promise<string> {
  const payload = await buildBackupPayload();
  const json = JSON.stringify(payload, null, 2);
  const file = new File(Paths.cache, `dues-backup-${timestampSlug(payload.exportedAt)}.json`);
  file.write(json);
  return file.uri;
}

export async function shareExportedBackup(): Promise<void> {
  const uri = await exportBackupToFile();
  await Sharing.shareAsync(uri, {
    mimeType: 'application/json',
    dialogTitle: 'Export Dues backup',
  });
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (result.canceled || result.assets.length === 0) return null;
  return result.assets[0]?.uri ?? null;
}

function asFiniteInt(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : null;
}

function normalizePerson(raw: unknown): Result<Person> {
  if (typeof raw !== 'object' || raw == null) return { ok: false, error: 'Invalid person entry' };
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' ? r.id : null;
  const name = typeof r.name === 'string' ? r.name.trim() : '';
  if (!id || !name) return { ok: false, error: 'Person entry missing id or name' };
  const createdAt = asFiniteInt(r.createdAt);
  if (createdAt == null) return { ok: false, error: `Person "${name}" has invalid dates` };
  return ok({
    id,
    name,
    note: typeof r.note === 'string' ? r.note : null,
    createdAt,
    updatedAt: asFiniteInt(r.updatedAt) ?? createdAt,
  });
}

function normalizeCategory(raw: unknown): Result<Category> {
  if (typeof raw !== 'object' || raw == null) return { ok: false, error: 'Invalid category entry' };
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' ? r.id : null;
  const name = typeof r.name === 'string' ? r.name.trim() : '';
  const createdAt = asFiniteInt(r.createdAt);
  if (!id || !name || createdAt == null) {
    return { ok: false, error: `Invalid category entry${name ? ` "${name}"` : ''}` };
  }
  return ok({ id, name, createdAt });
}

function normalizeDue(raw: unknown): Result<Due> {
  if (typeof raw !== 'object' || raw == null) return { ok: false, error: 'Invalid due entry' };
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' ? r.id : null;
  const personId = typeof r.personId === 'string' ? r.personId : null;
  const direction = r.direction as Direction;
  const kind = r.kind as DueKind;
  const createdAt = asFiniteInt(r.createdAt);
  if (!id || !personId || createdAt == null) {
    return { ok: false, error: 'Due entry missing id, person or dates' };
  }
  if ((direction !== 'borrowed' && direction !== 'lent') || (kind !== 'money' && kind !== 'item')) {
    return { ok: false, error: 'Due entry has invalid type fields' };
  }

  let amountMinor: number | null = null;
  let currencyCode: string | null = null;
  if (kind === 'money') {
    amountMinor = asFiniteInt(r.amountMinor);
    currencyCode = typeof r.currencyCode === 'string' ? r.currencyCode.toUpperCase() : null;
    if (amountMinor == null || amountMinor <= 0) {
      return { ok: false, error: `Money due ${id} has an invalid amount` };
    }
    if (!currencyCode || !isKnownCurrency(currencyCode)) {
      return { ok: false, error: `Money due ${id} references unknown currency "${String(r.currencyCode)}"` };
    }
  } else {
    const itemName = typeof r.itemName === 'string' ? r.itemName.trim() : '';
    if (!itemName) return { ok: false, error: `Item due ${id} has no name` };
  }

  const trackQuantity = r.trackQuantity === true;
  const rawQuantity = asFiniteInt(r.quantity);
  if (kind === 'item' && trackQuantity && (rawQuantity == null || rawQuantity <= 0)) {
    return { ok: false, error: `Item due ${id} tracks quantities but has none` };
  }
  if (!trackQuantity && rawQuantity != null && kind === 'item') {
    // Non-tracking items must not carry a quantity.
    return { ok: false, error: `Item due ${id} carries a quantity without quantity tracking` };
  }

  const reminder =
    r.reminderConfig == null
      ? null
      : parseReminderConfig(typeof r.reminderConfig === 'string' ? r.reminderConfig : null);

  const due: Due = {
    id,
    personId,
    direction,
    kind,
    amountMinor,
    currencyCode,
    itemName: typeof r.itemName === 'string' ? r.itemName.trim() : null,
    itemDescription: typeof r.itemDescription === 'string' ? r.itemDescription : null,
    trackQuantity,
    quantity: trackQuantity ? rawQuantity : null,
    categoryId: typeof r.categoryId === 'string' ? r.categoryId : null,
    dueDate: asFiniteInt(r.dueDate),
    note: typeof r.note === 'string' ? r.note : null,
    reminderConfig: reminder ?? (r.reminderConfig as Due['reminderConfig'] | null) ?? null,
    archived: r.archived === true,
    manuallySettledAt: asFiniteInt(r.manuallySettledAt),
    createdAt,
    updatedAt: asFiniteInt(r.updatedAt) ?? createdAt,
  };

  if (due.reminderConfig != null) {
    const check = validateReminderShape(due.reminderConfig);
    if (!check.ok) return { ok: false, error: `Due ${id}: ${check.error}` };
  }
  return ok(due);
}

function validateReminderShape(config: NonNullable<Due['reminderConfig']>): Result<true> {
  if (
    config.hour < 0 ||
    config.hour > 23 ||
    !Number.isInteger(config.hour) ||
    !Number.isInteger(config.minute) ||
    config.minute < 0 ||
    config.minute > 59
  ) {
    return { ok: false, error: 'invalid reminder time' };
  }
  switch (config.frequency) {
    case 'weekly':
      if (!config.weekday || config.weekday < 1 || config.weekday > 7) {
        return { ok: false, error: 'weekly reminder missing weekday' };
      }
      break;
    case 'monthly':
      if (!config.dayOfMonth || config.dayOfMonth < 1 || config.dayOfMonth > 31) {
        return { ok: false, error: 'monthly reminder missing day of month' };
      }
      break;
    case 'custom':
      if (!config.weekdays?.length) return { ok: false, error: 'custom reminder missing weekdays' };
      break;
    case 'daily':
      break;
  }
  return ok(true);
}

function normalizePayment(raw: unknown, duesById: Map<string, Due>): Result<Payment> {
  if (typeof raw !== 'object' || raw == null) return { ok: false, error: 'Invalid payment entry' };
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' ? r.id : null;
  const dueId = typeof r.dueId === 'string' ? r.dueId : null;
  const amountMinor = asFiniteInt(r.amountMinor);
  const paidAt = asFiniteInt(r.paidAt);
  if (!id || !dueId || amountMinor == null || amountMinor <= 0 || paidAt == null) {
    return { ok: false, error: 'Payment entry missing required fields' };
  }
  const parent = duesById.get(dueId);
  if (!parent) return { ok: false, error: `Payment ${id} references a missing due` };
  if (parent.kind !== 'money' || !parent.currencyCode) {
    return { ok: false, error: `Payment ${id} references a non-money due` };
  }
  const currencyCode = typeof r.currencyCode === 'string' ? r.currencyCode.toUpperCase() : null;
  if (currencyCode !== parent.currencyCode) {
    return {
      ok: false,
      error: `Payment ${id} uses a different currency than its due (${parent.currencyCode})`,
    };
  }
  return ok({
    id,
    dueId,
    amountMinor,
    currencyCode: parent.currencyCode,
    note: typeof r.note === 'string' ? r.note : null,
    paidAt,
    createdAt: asFiniteInt(r.createdAt) ?? paidAt,
  });
}

function normalizeReturn(raw: unknown, duesById: Map<string, Due>): Result<ItemReturnRecord> {
  if (typeof raw !== 'object' || raw == null) return { ok: false, error: 'Invalid return entry' };
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' ? r.id : null;
  const dueId = typeof r.dueId === 'string' ? r.dueId : null;
  const returnedAt = asFiniteInt(r.returnedAt);
  if (!id || !dueId || returnedAt == null) {
    return { ok: false, error: 'Return entry missing required fields' };
  }
  const parent = duesById.get(dueId);
  if (!parent) return { ok: false, error: `Return ${id} references a missing due` };

  const note = typeof r.note === 'string' ? r.note : null;
  const createdAt = asFiniteInt(r.createdAt) ?? returnedAt;

  if (parent.kind === 'item' && parent.trackQuantity) {
    const quantity = asFiniteInt(r.quantity);
    if (quantity == null || quantity <= 0) {
      return { ok: false, error: `Return ${id} needs a positive quantity` };
    }
    if (quantity > (parent.quantity ?? 0)) {
      return { ok: false, error: `Return ${id} exceeds the item's original quantity` };
    }
    return ok({
      id,
      dueId,
      kind: 'quantity',
      quantity,
      status: null,
      note,
      returnedAt,
      createdAt,
    });
  }

  const status = r.status as NonQuantityReturnMark;
  if (status !== 'partial' && status !== 'full') {
    return { ok: false, error: `Return ${id} has an invalid status mark` };
  }
  return ok({ id, dueId, kind: 'status', quantity: null, status, note, returnedAt, createdAt });
}

/**
 * Full structural + relational validation. Nothing touches the database until
 * this succeeds for every row.
 */
export function validateBackup(raw: unknown): Result<NormalizedBackup> {
  if (typeof raw !== 'object' || raw == null) return { ok: false, error: 'Not a valid backup file' };
  const p = raw as Record<string, unknown>;
  if (p.format !== BACKUP_FORMAT) {
    return { ok: false, error: 'This file is not a Dues backup' };
  }
  if (p.version !== BACKUP_VERSION) {
    return { ok: false, error: `Unsupported backup version (${String(p.version)})` };
  }
  const exportedAt = asFiniteInt(p.exportedAt) ?? Date.now();

  const people: Person[] = [];
  for (const rawPerson of Array.isArray(p.people) ? p.people : []) {
    const res = normalizePerson(rawPerson);
    if (!res.ok) return res;
    people.push(res.value);
  }
  const personIds = new Set(people.map((x) => x.id));
  if (personIds.size !== people.length) return { ok: false, error: 'Duplicate people found in backup' };

  const categories: Category[] = [];
  for (const rawCat of Array.isArray(p.categories) ? p.categories : []) {
    const res = normalizeCategory(rawCat);
    if (!res.ok) return res;
    categories.push(res.value);
  }

  const dues: Due[] = [];
  for (const rawDue of Array.isArray(p.dues) ? p.dues : []) {
    const res = normalizeDue(rawDue);
    if (!res.ok) return res;
    const due = res.value;
    if (!personIds.has(due.personId)) {
      return { ok: false, error: `Due ${due.id} references a missing person` };
    }
    if (due.categoryId && !categories.some((c) => c.id === due.categoryId)) {
      due.categoryId = null; // tolerate dangling category refs by clearing them
    }
    dues.push(due);
  }
  const duesById = new Map(dues.map((d) => [d.id, d]));
  if (duesById.size !== dues.length) return { ok: false, error: 'Duplicate dues found in backup' };

  const payments: Payment[] = [];
  for (const rawPay of Array.isArray(p.payments) ? p.payments : []) {
    const res = normalizePayment(rawPay, duesById);
    if (!res.ok) return res;
    payments.push(res.value);
  }
  const returns: ItemReturnRecord[] = [];
  for (const rawRet of Array.isArray(p.returns) ? p.returns : []) {
    const res = normalizeReturn(rawRet, duesById);
    if (!res.ok) return res;
    returns.push(res.value);
  }

  const settings: Record<string, string> = {};
  if (typeof p.settings === 'object' && p.settings != null) {
    for (const [k, v] of Object.entries(p.settings)) {
      if (typeof k === 'string' && typeof v === 'string') settings[k] = v;
    }
  }

  return ok({ meta: { exportedAt, appVersion: typeof p.appVersion === 'string' ? p.appVersion : undefined }, people, categories, dues, payments, returns, settings });
}

export async function readBackupFile(uri: string): Promise<unknown> {
  const file = new File(uri);
  const text = await file.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('The file could not be parsed as JSON');
  }
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

async function wipeEntityTables(): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    // Children first for clarity; cascades would handle them anyway.
    await db.runAsync(`DELETE FROM payments`);
    await db.runAsync(`DELETE FROM item_returns`);
    await db.runAsync(`DELETE FROM dues`);
    await db.runAsync(`DELETE FROM people`);
    await db.runAsync(`DELETE FROM categories`);
    await db.runAsync(`DELETE FROM reminder_registry`);
    await db.runAsync(`DELETE FROM settings`);
  });
}

/**
 * REPLACE: wipes all local data and restores exactly the backup contents.
 * Only ever called after the user explicitly confirms in the UI.
 */
export async function applyBackupReplace(backup: NormalizedBackup): Promise<void> {
  await wipeEntityTables();
  for (const person of backup.people) await insertPerson(person);
  for (const category of backup.categories) await insertCategoryExact(category);
  for (const due of backup.dues) await insertDue(due);
  for (const payment of backup.payments) await insertPayment(payment);
  for (const record of backup.returns) await insertItemReturn(record);
  await restoreRawSettings(backup.settings);
}

/**
 * MERGE: adds rows whose ids do not exist locally; conflicting ids are kept
 * as-is (never overwritten). Restores the report counts shown to the user.
 */
export async function applyBackupMerge(backup: NormalizedBackup): Promise<MergeReport> {
  const [
    existingPeople,
    existingCategories,
    existingDues,
    existingPayments,
    existingReturns,
  ] = await Promise.all([
    listPeople(),
    listCategories(),
    listDues({ includeDeleted: true }),
    listAllPayments(),
    listAllReturns(),
  ]);

  const peopleIds = new Set(existingPeople.map((x) => x.id));
  const categoryIds = new Set(existingCategories.map((x) => x.id));
  const dueIds = new Set(existingDues.map((x) => x.id));
  const paymentIds = new Set(existingPayments.map((x) => x.id));
  const returnIds = new Set(existingReturns.map((x) => x.id));

  const report: MergeReport = {
    peopleAdded: 0,
    categoriesAdded: 0,
    duesAdded: 0,
    paymentsAdded: 0,
    returnsAdded: 0,
    skipped: 0,
  };

  for (const person of backup.people) {
    if (peopleIds.has(person.id)) {
      report.skipped += 1;
      continue;
    }
    await insertPerson(person);
    peopleIds.add(person.id);
    report.peopleAdded += 1;
  }
  for (const category of backup.categories) {
    if (categoryIds.has(category.id)) {
      report.skipped += 1;
      continue;
    }
    await insertCategoryExact(category);
    categoryIds.add(category.id);
    report.categoriesAdded += 1;
  }

  // Dues must be inserted before payments/returns referencing them.
  const addedDueIds = new Set<string>();
  for (const due of backup.dues) {
    if (dueIds.has(due.id)) {
      report.skipped += 1;
      continue;
    }
    await insertDue(due);
    dueIds.add(due.id);
    addedDueIds.add(due.id);
    report.duesAdded += 1;
  }
  for (const payment of backup.payments) {
    if (paymentIds.has(payment.id)) {
      report.skipped += 1;
      continue;
    }
    if (!addedDueIds.has(payment.dueId)) {
      // Parent due already exists locally; still safe to attach the payment
      // because validation confirmed currency consistency with the parent.
      const parent = existingDues.find((d) => d.id === payment.dueId);
      if (!parent || parent.currencyCode !== payment.currencyCode) {
        report.skipped += 1;
        continue;
      }
    }
    await insertPayment(payment);
    paymentIds.add(payment.id);
    report.paymentsAdded += 1;
  }
  for (const record of backup.returns) {
    if (returnIds.has(record.id)) {
      report.skipped += 1;
      continue;
    }
    await insertItemReturn(record);
    returnIds.add(record.id);
    report.returnsAdded += 1;
  }

  return report;
}

/** Deletes every entity and resets settings to defaults. */
export async function deleteAllData(): Promise<void> {
  await wipeEntityTables();
  await restoreRawSettings({});
}

