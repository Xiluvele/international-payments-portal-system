import { apiFetch } from './client';

export type AuditEntry = {
  timestamp: string;
  event: string;
  [key: string]: unknown;
};

export async function fetchRecentAuditEntries(limit = 50) {
  return apiFetch<{ entries: AuditEntry[] }>(`/api/audit/recent?limit=${limit}`);
}
