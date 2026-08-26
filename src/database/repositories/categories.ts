import { getDatabase } from '../db';
import { rowToCategory, CategoryRow } from '../mappers';
import { Category } from '../../types';
import { newId } from '../../services/id';

export async function listCategories(): Promise<Category[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<CategoryRow>(
    `SELECT * FROM categories ORDER BY name COLLATE NOCASE ASC`
  );
  return rows.map(rowToCategory);
}

export async function insertCategory(name: string): Promise<Category> {
  const db = await getDatabase();
  const category: Category = { id: newId(), name: name.trim(), createdAt: Date.now() };
  await db.runAsync(
    `INSERT INTO categories (id, name, created_at) VALUES (?, ?, ?)`,
    category.id,
    category.name,
    category.createdAt
  );
  return category;
}

/** Inserts a category preserving its existing id (backup restore path). */
export async function insertCategoryExact(category: Category): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR IGNORE INTO categories (id, name, created_at) VALUES (?, ?, ?)`,
    category.id,
    category.name,
    category.createdAt
  );
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDatabase();
  // Dues referencing this category keep existing (ON DELETE SET NULL).
  await db.runAsync(`DELETE FROM categories WHERE id = ?`, id);
}

export async function seedDefaultCategories(defaults: readonly string[]): Promise<void> {
  const db = await getDatabase();
  const count = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM categories`);
  if ((count?.n ?? 0) > 0) return;
  await db.withTransactionAsync(async () => {
    for (const name of defaults) {
      const category = { id: newId(), name, createdAt: Date.now() };
      await db.runAsync(
        `INSERT OR IGNORE INTO categories (id, name, created_at) VALUES (?, ?, ?)`,
        category.id,
        category.name,
        category.createdAt
      );
    }
  });
}
