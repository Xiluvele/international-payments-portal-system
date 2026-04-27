import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { dbPromise } from './db.js';
import { env } from '../config/env.js';
import type { LoginInput, RegisterInput } from '../utils/validators.js';

const SALT_ROUNDS = 12;

const WEAK_PASSWORDS = ['Password1!', 'Admin123!', 'Welcome1@'];

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

export async function registerUser(input: RegisterInput) {
  const db = await dbPromise;
  const existing = await db.get('SELECT id FROM users WHERE username = ?', input.accountNumber);

  if (existing) {
    throw new Error('Account number already registered.');
  }

  if (WEAK_PASSWORDS.includes(input.password)) {
    throw new Error('Password is too common. Choose a stronger one.');
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const result = await db.run(
    'INSERT INTO users (username, full_name, id_number, password_hash, role) VALUES (?, ?, ?, ?, ?)',
    input.accountNumber,
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

export async function seedEmployees() {
  const db = await dbPromise;
  const hash = await bcrypt.hash('BankEmployee@1', SALT_ROUNDS);

  const employees = [
    { username: '10000000', fullName: 'Bank Employee',    idNumber: '0000000000000' },
    { username: '10000001', fullName: 'TalinUser',        idNumber: '0000000000001' },
    { username: '10000002', fullName: 'NokubongaUser',    idNumber: '0000000000002' },
    { username: '10000003', fullName: 'SimaUser',         idNumber: '0000000000003' },
  ];

  let seededAny = false;
  for (const emp of employees) {
    const existing = await db.get('SELECT id FROM users WHERE username = ?', emp.username);
    if (!existing) {
      await db.run(
        'INSERT INTO users (username, full_name, id_number, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        emp.username,
        emp.fullName,
        emp.idNumber,
        hash,
        'employee',
      );
      seededAny = true;
    }
  }

  if (seededAny) {
    console.log('\n--- Employee accounts seeded ---');
    for (const emp of employees) {
      console.log(`  Full name: ${emp.fullName.padEnd(16)} Account: ${emp.username}`);
    }
    console.log('  (See deployment docs for credentials)');
    console.log('--------------------------------\n');
  }
}

export async function loginUser(input: LoginInput) {
  const db = await dbPromise;
  const user = await db.get<{
    id: number;
    username: string;
    full_name: string;
    role: string;
    password_hash: string;
  }>('SELECT id, username, full_name, role, password_hash FROM users WHERE full_name = ? AND username = ?', input.username, input.accountNumber);

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
