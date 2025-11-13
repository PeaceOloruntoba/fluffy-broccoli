import { db } from '../shared/config/db.js';
import type { User } from './type.js';

export async function findUserByEmailOrUsername(identifier: string): Promise<(User & { password: string }) | null> {
  const { rows } = await db.query(
    `SELECT id, name, username, email, role, last_login, created_at, updated_at, password
     FROM users
     WHERE email = $1 OR username = $1
     LIMIT 1`,
    [identifier]
  );
  return rows[0] ?? null;
}

export async function updateLastLogin(userId: string): Promise<void> {
  await db.query(`UPDATE users SET last_login = now() WHERE id = $1`, [userId]);
}

export async function getUserByEmail(email: string): Promise<(User & { password: string }) | null> {
  const { rows } = await db.query(
    `SELECT id, name, username, email, role, last_login, created_at, updated_at, password
     FROM users WHERE email = $1 LIMIT 1`,
    [email]
  );
  return rows[0] ?? null;
}

export async function insertOtp(email: string, code: string, purpose: 'email_verify' | 'password_reset', expiresAt: Date): Promise<void> {
  await db.query(
    `INSERT INTO otps (email, code, purpose, expires_at) VALUES ($1, $2, $3, $4)`,
    [email, code, purpose, expiresAt]
  );
}

export async function findValidOtp(email: string, code: string, purpose: 'email_verify' | 'password_reset'): Promise<{ id: string } | null> {
  const { rows } = await db.query(
    `SELECT id FROM otps WHERE email = $1 AND code = $2 AND purpose = $3 AND consumed_at IS NULL AND expires_at > now() LIMIT 1`,
    [email, code, purpose]
  );
  return rows[0] ?? null;
}

export async function consumeOtp(id: string): Promise<void> {
  await db.query(`UPDATE otps SET consumed_at = now() WHERE id = $1`, [id]);
}

export async function updateUserPassword(userId: string, password: string): Promise<void> {
  await db.query(`UPDATE users SET password = $1, updated_at = now() WHERE id = $2`, [password, userId]);
}
export {};
