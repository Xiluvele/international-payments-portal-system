import { dbPromise } from './db.js';
import type { PaymentInput } from '../utils/validators.js';

export async function createPayment(userId: number, input: PaymentInput) {
  const db = await dbPromise;
  const result = await db.run(
    `INSERT INTO payments (user_id, beneficiary_name, beneficiary_account, swift_code, currency, amount, reference)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    userId,
    input.beneficiaryName,
    input.beneficiaryAccount,
    input.swiftCode,
    input.currency,
    Number(input.amount),
    input.reference,
  );

  return db.get(
    `SELECT id, beneficiary_name as beneficiaryName, beneficiary_account as beneficiaryAccount,
            swift_code as swiftCode, currency, amount, reference, status, created_at as createdAt
     FROM payments WHERE id = ?`,
    result.lastID,
  );
}

export async function getPaymentsForUser(userId: number) {
  const db = await dbPromise;
  return db.all(
    `SELECT id, beneficiary_name as beneficiaryName, beneficiary_account as beneficiaryAccount,
            swift_code as swiftCode, currency, amount, reference, status, created_at as createdAt
     FROM payments WHERE user_id = ? ORDER BY datetime(created_at) DESC`,
    userId,
  );
}

export async function getAllPayments() {
  const db = await dbPromise;
  return db.all(
    `SELECT p.id, p.user_id as userId, u.full_name as customerName,
            p.beneficiary_name as beneficiaryName, p.beneficiary_account as beneficiaryAccount,
            p.swift_code as swiftCode, p.currency, p.amount, p.reference,
            p.status, p.created_at as createdAt
     FROM payments p
     JOIN users u ON p.user_id = u.id
     ORDER BY datetime(p.created_at) DESC`,
  );
}

export async function verifyPayment(paymentId: number, employeeId: number) {
  const db = await dbPromise;
  const payment = await db.get<{ id: number; status: string }>(
    'SELECT id, status FROM payments WHERE id = ?',
    paymentId,
  );
  if (!payment) throw new Error('Payment not found.');
  if (payment.status !== 'pending') throw new Error('Only pending payments can be verified.');

  await db.run(
    'UPDATE payments SET status = ?, verified_by = ? WHERE id = ?',
    'verified',
    employeeId,
    paymentId,
  );

  return { id: paymentId, status: 'verified' };
}

export async function submitPaymentsToSwift() {
  const db = await dbPromise;
  const verified = await db.all<{ id: number }[]>('SELECT id FROM payments WHERE status = ?', 'verified');
  if (verified.length === 0) throw new Error('No verified payments to submit.');

  await db.run(`UPDATE payments SET status = 'submitted' WHERE status = 'verified'`);

  return { submittedCount: verified.length };
}
