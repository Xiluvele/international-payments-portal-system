import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { dbPromise } from './db.js';
import { env } from '../config/env.js';
import type { LoginInput } from '../utils/validators.js';

const SALT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export class AccountLockedError extends Error {
  constructor(public readonly lockedUntil: Date) {
    super('Account temporarily locked due to repeated failed login attempts. Try again later.');
    this.name = 'AccountLockedError';
  }
}

// jti -> expiry timestamp (ms). Pruned on each verify to prevent unbounded growth.
const tokenBlacklist = new Map<string, number>();

function pruneBlacklist() {
  const now = Date.now();
  for (const [jti, expiresAt] of tokenBlacklist) {
    if (now > expiresAt) tokenBlacklist.delete(jti);
  }
}

export function revokeToken(token: string) {
  try {
    const payload = jwt.decode(token) as { jti?: string; exp?: number } | null;
    if (payload?.jti) {
      const expiresAt = payload.exp ? payload.exp * 1000 : Date.now() + 15 * 60 * 1000;
      tokenBlacklist.set(payload.jti, expiresAt);
    }
  } catch {
    // malformed token — nothing to revoke
  }
}

export async function seedAccounts() {
  const db = await dbPromise;
  const employeeHash = await bcrypt.hash('BankEmployee@1', SALT_ROUNDS);
  const customerHash = await bcrypt.hash('Customer@2026', SALT_ROUNDS);
  const adminHash = await bcrypt.hash('AuditAdmin@2026', SALT_ROUNDS);

  const employees = [
    { username: '10000000', email: 'employee0@bank.local', fullName: 'Bank Employee',    idNumber: '0000000000000', hash: employeeHash, role: 'employee' as const },
    { username: '10000001', email: 'employee1@bank.local', fullName: 'TalinUser',        idNumber: '0000000000001', hash: employeeHash, role: 'employee' as const },
    { username: '10000002', email: 'employee2@bank.local', fullName: 'NokubongaUser',    idNumber: '0000000000002', hash: employeeHash, role: 'employee' as const },
    { username: '10000003', email: 'employee3@bank.local', fullName: 'SimaUser',         idNumber: '0000000000003', hash: employeeHash, role: 'employee' as const },
  ];

  const customers = [
    { username: '20000001', email: 'jane.smith@example.com',  fullName: 'Jane Smith',  idNumber: '9001010001081', hash: customerHash, role: 'customer' as const },
    { username: '20000002', email: 'john.doe@example.com',    fullName: 'John Doe',    idNumber: '9203030002082', hash: customerHash, role: 'customer' as const },
    { username: '20000003', email: 'amara.naidoo@example.com', fullName: 'Amara Naidoo', idNumber: '8807070003083', hash: customerHash, role: 'customer' as const },
  ];

  const admins = [
    { username: '30000001', email: 'audit.admin@bank.local', fullName: 'Audit Admin', idNumber: '7506060001084', hash: adminHash, role: 'admin' as const },
  ];

  const all = [...employees, ...customers, ...admins];

  let seededAny = false;
  for (const acc of all) {
    const existing = await db.get('SELECT id FROM users WHERE username = ?', acc.username);
    if (!existing) {
      await db.run(
        'INSERT INTO users (username, email, full_name, id_number, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)',
        acc.username,
        acc.email,
        acc.fullName,
        acc.idNumber,
        acc.hash,
        acc.role,
      );
      seededAny = true;
    }
  }

  if (seededAny) {
    console.log('\n--- Accounts seeded (no self-registration is permitted) ---');
    for (const acc of all) {
      console.log(`  [${acc.role.padEnd(8)}] ${acc.fullName.padEnd(16)} Account: ${acc.username}`);
    }
    console.log('  (Credentials documented in README)');
    console.log('-----------------------------------------------------------\n');
  }
}

export async function loginUser(input: LoginInput) {
  const db = await dbPromise;
  const user = await db.get<{
    id: number;
    username: string;
    email: string;
    full_name: string;
    role: string;
    password_hash: string;
    failed_login_attempts: number;
    locked_until: string | null;
  }>(
    `SELECT id, username, email, full_name, role, password_hash,
            failed_login_attempts, locked_until
     FROM users WHERE (full_name = ? OR email = ?) AND username = ?`,
    input.username,
    input.username,
    input.accountNumber,
  );

  if (!user) {
    throw new Error('Invalid username or password.');
  }

  if (user.locked_until) {
    const lockedUntil = new Date(user.locked_until);
    if (lockedUntil.getTime() > Date.now()) {
      throw new AccountLockedError(lockedUntil);
    }
  }

  const isValid = await bcrypt.compare(input.password, user.password_hash);
  if (!isValid) {
    const nextAttempts = user.failed_login_attempts + 1;
    if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
      await db.run(
        'UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?',
        nextAttempts,
        lockedUntil.toISOString(),
        user.id,
      );
      throw new AccountLockedError(lockedUntil);
    }
    await db.run(
      'UPDATE users SET failed_login_attempts = ? WHERE id = ?',
      nextAttempts,
      user.id,
    );
    throw new Error('Invalid username or password.');
  }

  // Reset counters on a successful login
  if (user.failed_login_attempts > 0 || user.locked_until) {
    await db.run(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?',
      user.id,
    );
  }

  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    role: user.role,
  };
}

export function signJwt(user: { id: number; username: string; fullName: string; role: string }) {
  return jwt.sign({ ...user, jti: crypto.randomUUID() }, env.jwtSecret, { expiresIn: '15m' });
}

export function verifyJwt(token: string) {
  pruneBlacklist();
  const payload = jwt.verify(token, env.jwtSecret) as {
    id: number;
    username: string;
    fullName: string;
    role: string;
    jti: string;
  };
  if (tokenBlacklist.has(payload.jti)) {
    throw new Error('Token has been revoked.');
  }
  return payload;
}
