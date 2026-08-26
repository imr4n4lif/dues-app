import { getDatabase } from '../db';
import { PaymentRow, paymentToRow, rowToPayment } from '../mappers';
import { Payment } from '../../types';

export async function listPaymentsByDue(dueId: string): Promise<Payment[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<PaymentRow>(
    `SELECT * FROM payments WHERE due_id = ? ORDER BY paid_at DESC, created_at DESC`,
    dueId
  );
  return rows.map(rowToPayment);
}

export async function listAllPayments(): Promise<Payment[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<PaymentRow>(`SELECT * FROM payments`);
  return rows.map(rowToPayment);
}

export async function insertPayment(payment: Payment): Promise<void> {
  const db = await getDatabase();
  const p = paymentToRow(payment);
  await db.runAsync(
    `INSERT INTO payments (id, due_id, amount_minor, currency_code, note, paid_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    p.id,
    p.due_id,
    p.amount_minor,
    p.currency_code,
    p.note,
    p.paid_at,
    p.created_at
  );
}

export async function deletePayment(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM payments WHERE id = ?`, id);
}
