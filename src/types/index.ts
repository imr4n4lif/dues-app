export type Direction = 'borrowed' | 'lent';

export type DueKind = 'money' | 'item';

export type MoneyStatus = 'unpaid' | 'partially_paid' | 'fully_paid';

export type ItemStatus = 'not_returned' | 'partially_returned' | 'fully_returned';

export type DueStatus = MoneyStatus | ItemStatus;

export interface Person {
  id: string;
  name: string;
  note: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: string;
  name: string;
  createdAt: number;
}

export type ReminderFrequency = 'daily' | 'weekly' | 'monthly' | 'custom';

/** Local notification reminder attached to a due. Times are device-local. */
export interface ReminderConfig {
  frequency: ReminderFrequency;
  /** 0-23 */
  hour: number;
  /** 0-59 */
  minute: number;
  /** weekly: ISO weekday, Monday = 1 … Sunday = 7 */
  weekday?: number;
  /** monthly: 1-31 (months without that day fire on the last day of the month) */
  dayOfMonth?: number;
  /** custom: selected ISO weekdays, Monday = 1 … Sunday = 7 */
  weekdays?: number[];
}

export interface Due {
  id: string;
  personId: string;
  direction: Direction;
  kind: DueKind;

  /** Money dues only. Total amount stored in minor units (e.g. paisa/cents). */
  amountMinor: number | null;
  /** Money dues only. Frozen ISO 4217 code captured at creation time. */
  currencyCode: string | null;

  /** Item dues only. */
  itemName: string | null;
  itemDescription: string | null;
  trackQuantity: boolean;
  /** Item dues only. Present when trackQuantity is true. */
  quantity: number | null;

  categoryId: string | null;
  dueDate: number | null;
  note: string | null;
  reminderConfig: ReminderConfig | null;
  archived: boolean;
  /** Set when the user explicitly marks a due as settled ahead of completion. */
  manuallySettledAt: number | null;

  createdAt: number;
  updatedAt: number;
}

export interface Payment {
  id: string;
  dueId: string;
  /** Minor units; always interpreted in the parent due's currency. */
  amountMinor: number;
  /** Denormalized from the parent due for integrity checks and backups. */
  currencyCode: string;
  note: string | null;
  paidAt: number;
  createdAt: number;
}

export type NonQuantityReturnMark = 'partial' | 'full';

export interface ItemReturnRecord {
  id: string;
  dueId: string;
  kind: 'quantity' | 'status';
  /** Quantity-based returns only. */
  quantity: number | null;
  /** Non-quantity returns only. */
  status: NonQuantityReturnMark | null;
  note: string | null;
  returnedAt: number;
  createdAt: number;
}

export type ThemePreference = 'system' | 'light' | 'dark';

export interface Settings {
  defaultCurrencyCode: string;
  themePreference: ThemePreference;
  notificationsEnabled: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  defaultCurrencyCode: 'USD',
  themePreference: 'system',
  notificationsEnabled: true,
};
