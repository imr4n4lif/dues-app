import { getDatabase } from '../db';
import { itemReturnToRow, ReturnRow, rowToItemReturn } from '../mappers';
import { ItemReturnRecord } from '../../types';

export async function listReturnsByDue(dueId: string): Promise<ItemReturnRecord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ReturnRow>(
    `SELECT * FROM item_returns WHERE due_id = ? ORDER BY returned_at DESC, created_at DESC`,
    dueId
  );
  const result: ItemReturnRecord[] = [];
  for (const row of rows) {
    const record = rowToItemReturn(row);
    if (record) result.push(record);
  }
  return result;
}

export async function listAllReturns(): Promise<ItemReturnRecord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ReturnRow>(`SELECT * FROM item_returns`);
  const result: ItemReturnRecord[] = [];
  for (const row of rows) {
    const record = rowToItemReturn(row);
    if (record) result.push(record);
  }
  return result;
}

export async function insertItemReturn(record: ItemReturnRecord): Promise<void> {
  const db = await getDatabase();
  const r = itemReturnToRow(record);
  await db.runAsync(
    `INSERT INTO item_returns (id, due_id, kind, quantity, status, note, returned_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    r.id,
    r.due_id,
    r.kind,
    r.quantity,
    r.status,
    r.note,
    r.returned_at,
    r.created_at
  );
}

export async function deleteItemReturn(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM item_returns WHERE id = ?`, id);
}
