import { apiFetch } from './client';

export async function getCsrfToken() {
  const response = await apiFetch<{ csrfToken: string }>('/api/security/csrf-token');
  return response.csrfToken;
}
