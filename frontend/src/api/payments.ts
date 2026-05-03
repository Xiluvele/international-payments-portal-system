import { apiFetch } from './client';
import type { Payment } from '../types';

function csrfHeaders(csrfToken: string): HeadersInit {
  return { 'X-CSRF-Token': csrfToken };
}

export async function fetchPayments(csrfToken: string) {
  return apiFetch<{ payments: Payment[] }>('/api/payments', {
    headers: csrfHeaders(csrfToken),
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
    headers: csrfHeaders(csrfToken),
    body: JSON.stringify(payload),
  });
}

export async function fetchAllPayments(csrfToken: string) {
  return apiFetch<{ payments: Payment[] }>('/api/payments/all', {
    headers: csrfHeaders(csrfToken),
  });
}

export async function verifyPayment(csrfToken: string, paymentId: number) {
  return apiFetch<{ message: string; payment: { id: number; status: string } }>(
    `/api/payments/${paymentId}/verify`,
    {
      method: 'PATCH',
      headers: csrfHeaders(csrfToken),
    },
  );
}

export async function submitToSwift(csrfToken: string) {
  return apiFetch<{ message: string; submittedCount: number }>('/api/payments/submit-to-swift', {
    method: 'POST',
    headers: csrfHeaders(csrfToken),
  });
}
