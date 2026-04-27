import fs from 'node:fs';
import path from 'node:path';

const logPath = path.resolve(process.cwd(), 'data', 'audit.log');

export function auditLog(event: string, details: Record<string, unknown>) {
  const line = JSON.stringify({ timestamp: new Date().toISOString(), event, ...details });
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, `${line}\n`, 'utf8');
}
