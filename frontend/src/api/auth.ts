import { apiFetch } from './client';
import type { User } from '../types';

export async function registerUser(
  csrfToken: string,
  payload: { fullName: string; idNumber: string; accountNumber: string; password: string },
) {
  return apiFetch<{ message: string; user: User }>('/api/auth/register', {
    method: 'POST',
    headers: { 'CSRF-Token': csrfToken },
    body: JSON.stringify(payload),
  });
}

export async function loginUser(
  csrfToken: string,
  payload: { username: string; accountNumber: string; password: string },
) {
  return apiFetch<{ message: string; user: User }>('/api/auth/login', {
    method: 'POST',
    headers: { 'CSRF-Token': csrfToken },
    body: JSON.stringify(payload),
  });
}

export async function logoutUser() {
  return apiFetch<{ message: string }>('/api/auth/logout', {
    method: 'POST',
  });
}

export async function getCurrentUser() {
  return apiFetch<{ user: User }>('/api/auth/me');
}
