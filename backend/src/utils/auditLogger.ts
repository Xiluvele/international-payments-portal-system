import fs from 'node:fs';
import path from 'node:path';

const logPath = path.resolve(process.cwd(), 'data', 'audit.log');

export type AuditEntry = {
  timestamp: string;
  event: string;
  [key: string]: unknown;
};

export function auditLog(event: string, details: Record<string, unknown>) {
  const line = JSON.stringify({ timestamp: new Date().toISOString(), event, ...details });
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, `${line}\n`, 'utf8');
}

// Returns the most recent `limit` parsed audit entries, newest first.
// Reads the whole file synchronously — fine for the academic SQLite-sized log;
// for production, swap for streaming reverse-read or ship logs to a SIEM.
export function readRecentAuditEntries(limit: number): AuditEntry[] {
  if (!fs.existsSync(logPath)) return [];
  const raw = fs.readFileSync(logPath, 'utf8');
  const lines = raw.split('\n').filter((l) => l.trim().length > 0);
  const tail = lines.slice(-limit).reverse();
  const entries: AuditEntry[] = [];
  for (const line of tail) {
    try {
      entries.push(JSON.parse(line) as AuditEntry);
    } catch {
      // skip malformed line
    }
  }
  return entries;
}
