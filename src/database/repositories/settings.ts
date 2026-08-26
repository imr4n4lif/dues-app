import { DEFAULT_SETTINGS, Settings } from '../../types';
import { getDatabase } from '../db';

const KEY_DEFAULT_CURRENCY = 'defaultCurrencyCode';
const KEY_THEME_PREFERENCE = 'themePreference';
const KEY_NOTIFICATIONS_ENABLED = 'notificationsEnabled';

function coerceCurrency(value: string | undefined): string {
  return value && /^[A-Z]{3}$/.test(value) ? value : DEFAULT_SETTINGS.defaultCurrencyCode;
}

function coerceTheme(value: string | undefined): Settings['themePreference'] {
  return value === 'light' || value === 'dark' || value === 'system'
    ? value
    : DEFAULT_SETTINGS.themePreference;
}

export async function loadSettings(): Promise<Settings> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ key: string; value: string }>(`SELECT key, value FROM settings`);
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    defaultCurrencyCode: coerceCurrency(map.get(KEY_DEFAULT_CURRENCY)),
    themePreference: coerceTheme(map.get(KEY_THEME_PREFERENCE)),
    notificationsEnabled: map.has(KEY_NOTIFICATIONS_ENABLED)
      ? map.get(KEY_NOTIFICATIONS_ENABLED) === '1'
      : DEFAULT_SETTINGS.notificationsEnabled,
  };
}

async function put(dbKey: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    dbKey,
    value
  );
}

export async function saveSettings(settings: Settings): Promise<void> {
  await Promise.all([
    put(KEY_DEFAULT_CURRENCY, settings.defaultCurrencyCode),
    put(KEY_THEME_PREFERENCE, settings.themePreference),
    put(KEY_NOTIFICATIONS_ENABLED, settings.notificationsEnabled ? '1' : '0'),
  ]);
}

export async function loadRawSettingsMap(): Promise<Record<string, string>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ key: string; value: string }>(`SELECT key, value FROM settings`);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function restoreRawSettings(entries: Record<string, string>): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    for (const [key, value] of Object.entries(entries)) {
      if (typeof value !== 'string') continue;
      await db.runAsync(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        key,
        value
      );
    }
  });
}
