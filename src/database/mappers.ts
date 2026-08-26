import {
  Category,
  Direction,
  Due,
  DueKind,
  ItemReturnRecord,
  NonQuantityReturnMark,
  Payment,
  Person,
  ReminderConfig,
  ReminderFrequency,
} from '../types';

export interface PersonRow {
  id: string;
  name: string;
  note: string | null;
  created_at: number;
  updated_at: number;
}

export interface CategoryRow {
  id: string;
  name: string;
  created_at: number;
}

export interface DueRow {
  id: string;
  person_id: string;
  direction: string;
  kind: string;
  amount_minor: number | null;
  currency_code: string | null;
  item_name: string | null;
  item_description: string | null;
  track_quantity: number;
  quantity: number | null;
  category_id: string | null;
  due_date: number | null;
  note: string | null;
  reminder_config: string | null;
  archived: number;
  manually_settled_at: number | null;
  deleted_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface PaymentRow {
  id: string;
  due_id: string;
  amount_minor: number;
  currency_code: string;
  note: string | null;
  paid_at: number;
  created_at: number;
}

export interface ReturnRow {
  id: string;
  due_id: string;
  kind: string;
  quantity: number | null;
  status: string | null;
  note: string | null;
  returned_at: number;
  created_at: number;
}

function isDirection(value: unknown): value is Direction {
  return value === 'borrowed' || value === 'lent';
}

function isKind(value: unknown): value is DueKind {
  return value === 'money' || value === 'item';
}

function isFrequency(value: unknown): value is ReminderFrequency {
  return value === 'daily' || value === 'weekly' || value === 'monthly' || value === 'custom';
}

export function rowToPerson(row: PersonRow): Person {
  return {
    id: row.id,
    name: row.name,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function personToRow(person: Person): PersonRow {
  return {
    id: person.id,
    name: person.name,
    note: person.note,
    created_at: person.createdAt,
    updated_at: person.updatedAt,
  };
}

export function rowToCategory(row: CategoryRow): Category {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

export function categoryToRow(category: Category): CategoryRow {
  return { id: category.id, name: category.name, created_at: category.createdAt };
}

export function parseReminderConfig(json: string | null): ReminderConfig | null {
  if (!json) return null;
  try {
    const raw = JSON.parse(json) as Record<string, unknown>;
    if (!isFrequency(raw.frequency)) return null;
    const hour = typeof raw.hour === 'number' ? Math.trunc(raw.hour) : NaN;
    const minute = typeof raw.minute === 'number' ? Math.trunc(raw.minute) : NaN;
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
    if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;

    const config: ReminderConfig = { frequency: raw.frequency, hour, minute };
    if (typeof raw.weekday === 'number' && raw.weekday >= 1 && raw.weekday <= 7) {
      config.weekday = Math.trunc(raw.weekday);
    }
    if (typeof raw.dayOfMonth === 'number' && raw.dayOfMonth >= 1 && raw.dayOfMonth <= 31) {
      config.dayOfMonth = Math.trunc(raw.dayOfMonth);
    }
    if (Array.isArray(raw.weekdays)) {
      const days = raw.weekdays
        .filter((d): d is number => typeof d === 'number' && d >= 1 && d <= 7)
        .map((d) => Math.trunc(d));
      if (days.length > 0) config.weekdays = [...new Set(days)];
    }
    return config;
  } catch {
    return null;
  }
}

export function serializeReminderConfig(config: ReminderConfig): string {
  return JSON.stringify(config);
}

export function rowToDue(row: DueRow): Due | null {
  if (!isDirection(row.direction) || !isKind(row.kind)) return null;
  return {
    id: row.id,
    personId: row.person_id,
    direction: row.direction,
    kind: row.kind,
    amountMinor: row.amount_minor,
    currencyCode: row.currency_code,
    itemName: row.item_name,
    itemDescription: row.item_description,
    trackQuantity: row.track_quantity === 1,
    quantity: row.quantity,
    categoryId: row.category_id,
    dueDate: row.due_date,
    note: row.note,
    reminderConfig: parseReminderConfig(row.reminder_config),
    archived: row.archived === 1,
    manuallySettledAt: row.manually_settled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function dueToRow(due: Due, deletedAt: number | null = null): DueRow {
  return {
    id: due.id,
    person_id: due.personId,
    direction: due.direction,
    kind: due.kind,
    amount_minor: due.amountMinor,
    currency_code: due.currencyCode,
    item_name: due.itemName,
    item_description: due.itemDescription,
    track_quantity: due.trackQuantity ? 1 : 0,
    quantity: due.quantity,
    category_id: due.categoryId,
    due_date: due.dueDate,
    note: due.note,
    reminder_config: due.reminderConfig ? serializeReminderConfig(due.reminderConfig) : null,
    archived: due.archived ? 1 : 0,
    manually_settled_at: due.manuallySettledAt,
    deleted_at: deletedAt,
    created_at: due.createdAt,
    updated_at: due.updatedAt,
  };
}

export function rowToPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    dueId: row.due_id,
    amountMinor: row.amount_minor,
    currencyCode: row.currency_code,
    note: row.note,
    paidAt: row.paid_at,
    createdAt: row.created_at,
  };
}

export function paymentToRow(payment: Payment): PaymentRow {
  return {
    id: payment.id,
    due_id: payment.dueId,
    amount_minor: payment.amountMinor,
    currency_code: payment.currencyCode,
    note: payment.note,
    paid_at: payment.paidAt,
    created_at: payment.createdAt,
  };
}

function isReturnMark(value: unknown): value is NonQuantityReturnMark {
  return value === 'partial' || value === 'full';
}

export function rowToItemReturn(row: ReturnRow): ItemReturnRecord | null {
  if (row.kind !== 'quantity' && row.kind !== 'status') return null;
  if (row.kind === 'quantity') {
    if (row.quantity == null) return null;
    return {
      id: row.id,
      dueId: row.due_id,
      kind: 'quantity',
      quantity: row.quantity,
      status: null,
      note: row.note,
      returnedAt: row.returned_at,
      createdAt: row.created_at,
    };
  }
  if (!isReturnMark(row.status)) return null;
  return {
    id: row.id,
    dueId: row.due_id,
    kind: 'status',
    quantity: null,
    status: row.status,
    note: row.note,
    returnedAt: row.returned_at,
    createdAt: row.created_at,
  };
}

export function itemReturnToRow(record: ItemReturnRecord): ReturnRow {
  return {
    id: record.id,
    due_id: record.dueId,
    kind: record.kind,
    quantity: record.quantity,
    status: record.status,
    note: record.note,
    returned_at: record.returnedAt,
    created_at: record.createdAt,
  };
}
