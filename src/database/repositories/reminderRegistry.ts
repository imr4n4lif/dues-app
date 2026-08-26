import { getDatabase } from '../db';

export interface ReminderRegistryRow {
  /** Expo scheduled-notification identifier. */
  id: string;
  /** Grouping signature this notification belongs to. */
  signature: string;
  /** JSON payload: { dueIds, title }. */
  payload: string;
  scheduledAt: number;
}

export async function listReminderRegistry(): Promise<ReminderRegistryRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<ReminderRegistryRow>(
    `SELECT id, signature, payload, scheduled_at AS scheduledAt FROM reminder_registry`
  );
}

export async function replaceReminderRegistry(rows: ReminderRegistryRow[]): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM reminder_registry`);
    for (const row of rows) {
      await db.runAsync(
        `INSERT INTO reminder_registry (id, signature, payload, scheduled_at) VALUES (?, ?, ?, ?)`,
        row.id,
        row.signature,
        row.payload,
        row.scheduledAt
      );
    }
  });
}
