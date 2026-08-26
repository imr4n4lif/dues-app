import * as SQLite from 'expo-sqlite';

import { newId } from '../services/id';

const DATABASE_NAME = 'dues.db';

/**
 * Migration v1 — initial schema.
 *
 * Design notes:
 * - Money amounts are stored as integer minor units (paisa/cents); never floats.
 * - Every money due permanently stores its own ISO 4217 currency_code.
 * - Payments / returns are separate rows referencing their due (ON DELETE CASCADE),
 *   so totals are always derived from real records — never cached counters.
 * - Soft deletes (deleted_at) back the Undo action; rows are purged later.
 */
const MIGRATION_V1 = [
  `CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      note TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_people_name_lower ON people (name COLLATE NOCASE)`,

  `CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_lower ON categories (name COLLATE NOCASE)`,

  `CREATE TABLE IF NOT EXISTS dues (
      id TEXT PRIMARY KEY NOT NULL,
      person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      direction TEXT NOT NULL CHECK (direction IN ('borrowed', 'lent')),
      kind TEXT NOT NULL CHECK (kind IN ('money', 'item')),
      amount_minor INTEGER,
      currency_code TEXT,
      item_name TEXT,
      item_description TEXT,
      track_quantity INTEGER NOT NULL DEFAULT 0,
      quantity INTEGER CHECK (quantity IS NULL OR quantity > 0),
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      due_date INTEGER,
      note TEXT,
      reminder_config TEXT,
      archived INTEGER NOT NULL DEFAULT 0,
      manually_settled_at INTEGER,
      deleted_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      CHECK (
        (kind = 'money' AND amount_minor IS NOT NULL AND amount_minor > 0
           AND currency_code IS NOT NULL AND item_name IS NULL AND quantity IS NULL)
        OR
        (kind = 'item' AND item_name IS NOT NULL
           AND (quantity IS NULL OR (track_quantity = 1 AND quantity > 0)))
      )
   )`,
  `CREATE INDEX IF NOT EXISTS idx_dues_person ON dues (person_id)`,
  `CREATE INDEX IF NOT EXISTS idx_dues_active ON dues (archived, deleted_at)`,
  `CREATE INDEX IF NOT EXISTS idx_dues_due_date ON dues (due_date)`,
  `CREATE INDEX IF NOT EXISTS idx_dues_created ON dues (created_at)`,

  `CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY NOT NULL,
      due_id TEXT NOT NULL REFERENCES dues(id) ON DELETE CASCADE,
      amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
      currency_code TEXT NOT NULL,
      note TEXT,
      paid_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_payments_due ON payments (due_id)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments (paid_at)`,

  `CREATE TABLE IF NOT EXISTS item_returns (
      id TEXT PRIMARY KEY NOT NULL,
      due_id TEXT NOT NULL REFERENCES dues(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK (kind IN ('quantity', 'status')),
      quantity INTEGER CHECK (quantity IS NULL OR quantity > 0),
      status TEXT CHECK (status IS NULL OR status IN ('partial', 'full')),
      note TEXT,
      returned_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      CHECK (
        (kind = 'quantity' AND quantity IS NOT NULL AND status IS NULL)
        OR (kind = 'status' AND quantity IS NULL AND status IS NOT NULL)
      )
   )`,
  `CREATE INDEX IF NOT EXISTS idx_returns_due ON item_returns (due_id)`,
  `CREATE INDEX IF NOT EXISTS idx_returns_returned_at ON item_returns (returned_at)`,

  `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
   )`,

  `CREATE TABLE IF NOT EXISTS reminder_registry (
      id TEXT PRIMARY KEY NOT NULL,
      signature TEXT NOT NULL,
      payload TEXT NOT NULL,
      scheduled_at INTEGER NOT NULL
   )`,
];

const MIGRATIONS: ReadonlyArray<{ version: number; statements: string[] }> = [
  { version: 1, statements: MIGRATION_V1 },
];

let instancePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync(`PRAGMA journal_mode = WAL`);
  await db.execAsync(`PRAGMA foreign_keys = ON`);

  const current = (await db.getFirstAsync<{ user_version: number }>(`PRAGMA user_version`))
    ?.user_version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    await db.withTransactionAsync(async () => {
      for (const statement of migration.statements) {
        await db.execAsync(statement);
      }
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }

  // Purge soft-deleted dues whose Undo window (24h) has expired.
  const purgeCutoff = Date.now() - 24 * 60 * 60 * 1000;
  await db.runAsync(`DELETE FROM dues WHERE deleted_at IS NOT NULL AND deleted_at < ?`, purgeCutoff);

  return db;
}

/** Singleton accessor; safe to call repeatedly. */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!instancePromise) {
    instancePromise = openAndMigrate().catch((error) => {
      instancePromise = null;
      throw error;
    });
  }
  return instancePromise;
}

export { newId };
