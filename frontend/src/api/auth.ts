import { apiFetch } from './client';
import type { User } from '../types';

type RegisterPayload = {
  email: string;
  fullName: string;
  idNumber: string;
  accountNumber: string;
  password: string;
};

type LoginPayload = {
  username: string;
  accountNumber: string;
  password: string;
};

function csrfHeaders(csrfToken: string): HeadersInit {
  return { 'X-CSRF-Token': csrfToken };
}

export async function registerUser(csrfToken: string, payload: RegisterPayload) {
  return apiFetch<{ message: string; user: User }>('/api/auth/register', {
    method: 'POST',
    headers: csrfHeaders(csrfToken),
    body: JSON.stringify(payload),
  });
}

export async function loginUser(csrfToken: string, payload: LoginPayload) {
  return apiFetch<{ message: string; user: User }>('/api/auth/login', {
    method: 'POST',
    headers: csrfHeaders(csrfToken),
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
