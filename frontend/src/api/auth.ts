import { apiFetch } from './client';
import type { User } from '../types';

// ============================================================================
// 🔐 AUTHENTICATION API CLIENT
// Handles: Login, Registration, Session Management
// Guide Compliance: CSRF, HTTPS, Generic Errors
// ============================================================================

/**
 * Register a new user
 * @param csrfToken - CSRF token from server
 * @param data - Registration data (email, fullName, idNumber, accountNumber, password)
 * @returns Registration response with user info
 */
export async function registerUser(
  csrfToken: string,
  data: {
    email: string;
    fullName: string;
    idNumber: string;
    accountNumber: string;
    password: string;
  }
) {
  return apiFetch<{ message: string; user: User }>('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken, // 🔐 CSRF protection
    },
    body: JSON.stringify(data),
  });
}

/**
 * Login existing user
 * @param csrfToken - CSRF token from server
 * @param credentials - Login credentials (email, accountNumber, password)
 * @returns Login response with user session
 */
export async function loginUser(
  csrfToken: string,
  credentials: {
    /** Full name or email (sent to API as `username`). */
    identifier: string;
    accountNumber: string;
    password: string;
  }
) {
  const { identifier, accountNumber, password } = credentials;
  return apiFetch<{ message: string; user: User }>('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken, // 🔐 CSRF protection
    },
    body: JSON.stringify({
      username: identifier.trim(),
      accountNumber: accountNumber.replace(/\D/g, ''),
      password,
    }),
  });
}

/**
 * Logout current user
 * @param csrfToken - CSRF token from server
 */
export async function logoutUser(csrfToken: string) {
  return apiFetch<{ message: string }>('/api/auth/logout', {
    method: 'POST',
    headers: {
      'X-CSRF-Token': csrfToken,
    },
  });
}

/**
 * Get current authenticated user
 * @returns Current user data or null if not authenticated
 */
export async function getCurrentUser() {
  try {
    return await apiFetch<{ user: User | null }>('/api/auth/me', {
      method: 'GET',
    });
  } catch (error) {
    return { user: null };
  }
}