import { getDatabase } from '../db';
import { dueToRow, DueRow, rowToDue } from '../mappers';
import { Due } from '../../types';

/**
 * Lists dues. Soft-deleted rows are excluded unless explicitly requested
 * (they only exist to back the Undo action and are purged automatically).
 */
export async function listDues(options: { includeDeleted?: boolean } = {}): Promise<Due[]> {
  const db = await getDatabase();
  const rows = options.includeDeleted
    ? await db.getAllAsync<DueRow>(`SELECT * FROM dues ORDER BY created_at DESC`)
    : await db.getAllAsync<DueRow>(
        `SELECT * FROM dues WHERE deleted_at IS NULL ORDER BY created_at DESC`
      );
  const result: Due[] = [];
  for (const row of rows) {
    const due = rowToDue(row);
    if (due) result.push(due);
  }
  return result;
}

export async function getDueById(id: string): Promise<Due | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<DueRow>(`SELECT * FROM dues WHERE id = ?`, id);
  return row ? rowToDue(row) : null;
}

export async function insertDue(due: Due): Promise<void> {
  const db = await getDatabase();
  const r = dueToRow(due);
  await db.runAsync(
    `INSERT INTO dues (
       id, person_id, direction, kind, amount_minor, currency_code,
       item_name, item_description, track_quantity, quantity,
       category_id, due_date, note, reminder_config,
       archived, manually_settled_at, deleted_at, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    r.id,
    r.person_id,
    r.direction,
    r.kind,
    r.amount_minor,
    r.currency_code,
    r.item_name,
    r.item_description,
    r.track_quantity,
    r.quantity,
    r.category_id,
    r.due_date,
    r.note,
    r.reminder_config,
    r.archived,
    r.manually_settled_at,
    r.deleted_at,
    r.created_at,
    r.updated_at
  );
}

export async function updateDue(due: Due): Promise<void> {
  const db = await getDatabase();
  const r = dueToRow(due);
  await db.runAsync(
    `UPDATE dues SET
       person_id = ?, direction = ?, kind = ?, amount_minor = ?, currency_code = ?,
       item_name = ?, item_description = ?, track_quantity = ?, quantity = ?,
       category_id = ?, due_date = ?, note = ?, reminder_config = ?,
       archived = ?, manually_settled_at = ?, updated_at = ?
     WHERE id = ?`,
    r.person_id,
    r.direction,
    r.kind,
    r.amount_minor,
    r.currency_code,
    r.item_name,
    r.item_description,
    r.track_quantity,
    r.quantity,
    r.category_id,
    r.due_date,
    r.note,
    r.reminder_config,
    r.archived,
    r.manually_settled_at,
    r.updated_at,
    r.id
  );
}

/** Undo window entry point — row stays in DB but is hidden everywhere. */
export async function softDeleteDue(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE dues SET deleted_at = ? WHERE id = ?`, Date.now(), id);
}

export async function restoreDue(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE dues SET deleted_at = NULL WHERE id = ?`, id);
}

export async function hardDeleteDue(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM dues WHERE id = ?`, id);
}
