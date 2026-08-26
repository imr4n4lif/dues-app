import { getDatabase } from '../db';
import { personToRow, rowToPerson, PersonRow } from '../mappers';
import { Person } from '../../types';

export async function listPeople(): Promise<Person[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<PersonRow>(
    `SELECT * FROM people ORDER BY name COLLATE NOCASE ASC`
  );
  return rows.map(rowToPerson);
}

export async function getPerson(id: string): Promise<Person | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<PersonRow>(`SELECT * FROM people WHERE id = ?`, id);
  return row ? rowToPerson(row) : null;
}

export async function findPersonByName(name: string, excludeId?: string): Promise<Person | null> {
  const db = await getDatabase();
  const row = excludeId
    ? await db.getFirstAsync<PersonRow>(
        `SELECT * FROM people WHERE name = ? COLLATE NOCASE AND id != ?`,
        name.trim(),
        excludeId
      )
    : await db.getFirstAsync<PersonRow>(
        `SELECT * FROM people WHERE name = ? COLLATE NOCASE`,
        name.trim()
      );
  return row ? rowToPerson(row) : null;
}

export async function insertPerson(person: Person): Promise<void> {
  const db = await getDatabase();
  const p = personToRow(person);
  await db.runAsync(
    `INSERT INTO people (id, name, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
    p.id,
    p.name,
    p.note,
    p.created_at,
    p.updated_at
  );
}

export async function updatePerson(person: Person): Promise<void> {
  const db = await getDatabase();
  const p = personToRow(person);
  await db.runAsync(
    `UPDATE people SET name = ?, note = ?, updated_at = ? WHERE id = ?`,
    p.name,
    p.note,
    p.updated_at,
    p.id
  );
}

/** Cascades to the person's dues, payments and returns (FK ON DELETE CASCADE). */
export async function deletePerson(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM people WHERE id = ?`, id);
}
