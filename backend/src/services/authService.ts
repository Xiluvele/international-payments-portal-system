import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { dbPromise } from './db.js';
import { env } from '../config/env.js';
import { regexRules, type LoginInput, type RegisterInput } from '../utils/validators.js';

const SALT_ROUNDS = 12;

const WEAK_PASSWORDS = ['Password1!', 'Admin123!', 'Welcome1@'];

// ✅ REMOVED: in-memory tokenBlacklist Map
// ✅ REMOVED: pruneBlacklist function
// These are now handled by SQLite

export async function revokeToken(token: string) {
  try {
    const payload = jwt.decode(token) as { jti?: string; exp?: number } | null;
    if (payload?.jti) {
      const expiresAt = payload.exp ? payload.exp * 1000 : Date.now() + 15 * 60 * 1000;
      const db = await dbPromise;

      // ✅ Save revoked token to SQLite
      await db.run(
        'INSERT OR IGNORE INTO token_blacklist (jti, expires_at) VALUES (?, ?)',
        payload.jti,
        expiresAt,
      );

      // ✅ Clean up expired tokens
      await db.run('DELETE FROM token_blacklist WHERE expires_at < ?', Date.now());
    }
  } catch {
    // malformed token — nothing to revoke
  }
}

export async function registerUser(input: RegisterInput) {
  const db = await dbPromise;
  const emailNormalized = input.email.trim().toLowerCase();
  const existing = await db.get('SELECT id FROM users WHERE username = ?', input.accountNumber);

  if (existing) {
    throw new Error('Account number already registered.');
  }

  const existingEmail = await db.get('SELECT id FROM users WHERE lower(email) = ?', emailNormalized);
  if (existingEmail) {
    throw new Error('Email address already registered.');
  }

  if (WEAK_PASSWORDS.includes(input.password)) {
    throw new Error('Password is too common. Choose a stronger one.');
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const result = await db.run(
    'INSERT INTO users (username, email, full_name, id_number, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)',
    input.accountNumber,
    emailNormalized,
    input.fullName,
    input.idNumber,
    passwordHash,
    'customer',
  );

  return {
    id: result.lastID,
    username: input.accountNumber,
    fullName: input.fullName,
    role: 'customer',
  };
}

/** Demo password meets backend + frontend password policy (upper, lower, digit, special). */
const EMPLOYEE_DEMO_PASSWORD = 'BankEmployee@1';

export async function seedEmployees() {
  const db = await dbPromise;
  const hash = await bcrypt.hash(EMPLOYEE_DEMO_PASSWORD, SALT_ROUNDS);

  // Emails are valid RFC-style addresses for the login form; full names match register/login rules.
  const employees = [
    { username: '10000000', email: 'bank.employee@bank.local', fullName: 'Bank Employee', idNumber: '0000000000000' },
    { username: '10000001', email: 'talinuser@bank.local', fullName: 'TalinUser', idNumber: '0000000000001' },
    { username: '10000002', email: 'nokubongauser@bank.local', fullName: 'NokubongaUser', idNumber: '0000000000002' },
    { username: '10000003', email: 'simauser@bank.local', fullName: 'SimaUser', idNumber: '0000000000003' },
  ];

  for (const emp of employees) {
    const emailNorm = emp.email.trim().toLowerCase();
    const existing = await db.get<{ id: number }>('SELECT id FROM users WHERE username = ?', emp.username);
    if (existing) {
      await db.run(
        `UPDATE users SET email = ?, full_name = ?, password_hash = ?, role = 'employee' WHERE username = ?`,
        emailNorm,
        emp.fullName,
        hash,
        emp.username,
      );
    } else {
      await db.run(
        'INSERT INTO users (username, email, full_name, id_number, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)',
        emp.username,
        emailNorm,
        emp.fullName,
        emp.idNumber,
        hash,
        'employee',
      );
    }
  }

  console.log('\n--- Employee demo accounts (password for all: BankEmployee@1) ---');
  console.log('  Full name          Account    Email (or use full name on login)');
  for (const emp of employees) {
    console.log(
      `  ${emp.fullName.padEnd(18)} ${emp.username}   ${emp.email.toLowerCase()}`,
    );
  }
  console.log('------------------------------------------------------------------\n');
}

export async function loginUser(input: LoginInput) {
  const db = await dbPromise;
  const rawId = input.username.trim();
  const identifierForMatch = regexRules.email.test(rawId) ? rawId.toLowerCase() : rawId;
  const user = await db.get<{
    id: number;
    username: string;
    email: string;
    full_name: string;
    role: string;
    password_hash: string;
  }>(
    `SELECT id, username, email, full_name, role, password_hash FROM users
     WHERE username = ?
     AND (full_name = ? OR email = ? OR lower(email) = ?)`,
    input.accountNumber,
    rawId,
    rawId,
    identifierForMatch,
  );

  if (!user) {
    throw new Error('Invalid username or password.');
  }

  const isValid = await bcrypt.compare(input.password, user.password_hash);
  if (!isValid) {
    throw new Error('Invalid username or password.');
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

// ✅ Now async — checks SQLite instead of memory
export async function verifyJwt(token: string) {
  const payload = jwt.verify(token, env.jwtSecret) as {
    id: number;
    username: string;
    fullName: string;
    role: string;
    jti: string;
  };

  const db = await dbPromise;
  const revoked = await db.get(
    'SELECT jti FROM token_blacklist WHERE jti = ?',
    payload.jti,
  );

  if (revoked) {
    throw new Error('Token has been revoked.');
  }

  return payload;
}