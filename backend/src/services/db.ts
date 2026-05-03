import fs from 'node:fs';
import path from 'node:path';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

const dbDir = path.resolve(process.cwd(), 'data');
const dbPath = path.resolve(dbDir, 'portal.sqlite');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const dbPromise = open({
  filename: dbPath,
  driver: sqlite3.Database,
});

export async function initDb() {
  const db = await dbPromise;

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      id_number TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrations for existing databases
  try { await db.exec(`ALTER TABLE users ADD COLUMN id_number TEXT NOT NULL DEFAULT ''`); } catch { /* exists */ }
  try { await db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'customer'`); } catch { /* exists */ }

  await db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      beneficiary_name TEXT NOT NULL,
      beneficiary_account TEXT NOT NULL,
      swift_code TEXT NOT NULL,
      currency TEXT NOT NULL,
      amount REAL NOT NULL,
      reference TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      verified_by INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (verified_by) REFERENCES users(id)
    );
  `);

  // Migrations for existing databases
  try { await db.exec(`ALTER TABLE payments ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'`); } catch { /* exists */ }
  try { await db.exec(`ALTER TABLE payments ADD COLUMN verified_by INTEGER REFERENCES users(id)`); } catch { /* exists */ }

  // ✅ ADD THIS AT THE BOTTOM
  await db.exec(`
    CREATE TABLE IF NOT EXISTS token_blacklist (
      jti TEXT PRIMARY KEY,
      expires_at INTEGER NOT NULL
    );
  `);
}