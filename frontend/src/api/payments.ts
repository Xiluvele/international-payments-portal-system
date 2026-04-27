import { apiFetch } from './client';
import type { Payment } from '../types';

export async function fetchPayments(csrfToken: string) {
  return apiFetch<{ payments: Payment[] }>('/api/payments', {
    headers: { 'CSRF-Token': csrfToken },
  });
}

export async function createPayment(
  csrfToken: string,
  payload: {
    beneficiaryName: string;
    beneficiaryAccount: string;
    swiftCode: string;
    currency: string;
    amount: string;
    reference: string;
  },
) {
  return apiFetch<{ message: string; payment: Payment }>('/api/payments', {
    method: 'POST',
    headers: { 'CSRF-Token': csrfToken },
    body: JSON.stringify(payload),
  });
}

export async function fetchAllPayments(csrfToken: string) {
  return apiFetch<{ payments: Payment[] }>('/api/payments/all', {
    headers: { 'CSRF-Token': csrfToken },
  });
}

export async function verifyPayment(csrfToken: string, paymentId: number) {
  return apiFetch<{ message: string; payment: { id: number; status: string } }>(
    `/api/payments/${paymentId}/verify`,
    {
      method: 'PATCH',
      headers: { 'CSRF-Token': csrfToken },
    },
  );
}

export async function submitToSwift(csrfToken: string) {
  return apiFetch<{ message: string; submittedCount: number }>('/api/payments/submit-to-swift', {
    method: 'POST',
    headers: { 'CSRF-Token': csrfToken },
  });
}
