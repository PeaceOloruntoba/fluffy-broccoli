import { db } from '../shared/config/db.js';
import type { User } from './type.js';
import type { PoolClient } from 'pg';

export async function findUserByEmailOrUsername(identifier: string): Promise<(User & { password: string }) | null> {
  const { rows } = await db.query(
    `SELECT id, name, username, email, role, email_verified, last_login, created_at, updated_at, password
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
    `SELECT id, name, username, email, role, email_verified, last_login, created_at, updated_at, password
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

export async function setUserEmailVerifiedByEmail(email: string): Promise<void> {
  await db.query(`UPDATE users SET email_verified = true, updated_at = now() WHERE email = $1`, [email]);
}

export async function createUserTx(client: PoolClient, params: { name: string; email: string; password: string; role: 'superadmin' | 'admin' | 'parent' | 'teacher' | 'driver' | 'dev'; username?: string | null }): Promise<User & { password: string }> {
  const { rows } = await client.query(
    `INSERT INTO users (name, email, password, role, username)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, name, username, email, role, email_verified, last_login, created_at, updated_at, password`,
    [params.name, params.email, params.password, params.role, params.username ?? null]
  );
  return rows[0];
}

export async function insertSchoolTx(client: PoolClient, params: { user_id: string; name: string; school_code: string; phone?: string | null; state?: string | null; city?: string | null; country?: string | null; address?: string | null; latitude?: number | null; longitude?: number | null; logo_url?: string | null }) {
  await client.query(
    `INSERT INTO schools (user_id, name, school_code, phone, state, city, country, address, latitude, longitude, logo_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [params.user_id, params.name, params.school_code, params.phone ?? null, params.state ?? null, params.city ?? null, params.country ?? null, params.address ?? null, params.latitude ?? null, params.longitude ?? null, params.logo_url ?? null]
  );
}

export async function insertParentTx(client: PoolClient, params: { user_id: string; school_id: string; parent_code: string; fullname?: string | null; phone_number?: string | null; nin?: string | null; relationship?: 'Father'|'Mother'|'Aunty'|'Uncle' | null; address?: string | null; latitude?: number | null; longitude?: number | null }) {
  await client.query(
    `INSERT INTO parents (user_id, school_id, parent_code, fullname, phone_number, nin, relationship, address, latitude, longitude)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [params.user_id, params.school_id, params.parent_code, params.fullname ?? null, params.phone_number ?? null, params.nin ?? null, params.relationship ?? null, params.address ?? null, params.latitude ?? null, params.longitude ?? null]
  );
}

export async function insertTeacherTx(client: PoolClient, params: { user_id: string; school_id: string; teacher_code: string; name?: string | null; nin?: string | null; gender?: 'male'|'female' | null; dob?: string | null; nationality?: string | null; state_of_origin?: string | null; phone?: string | null; passport_photo_url?: string | null }) {
  await client.query(
    `INSERT INTO teachers (user_id, school_id, teacher_code, name, nin, gender, dob, nationality, state_of_origin, phone, passport_photo_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [params.user_id, params.school_id, params.teacher_code, params.name ?? null, params.nin ?? null, params.gender ?? null, params.dob ?? null, params.nationality ?? null, params.state_of_origin ?? null, params.phone ?? null, params.passport_photo_url ?? null]
  );
}

export async function insertDriverTx(client: PoolClient, params: { user_id: string; school_id: string; driver_code: string; name?: string | null; phone?: string | null }) {
  await client.query(
    `INSERT INTO drivers (user_id, school_id, code, name, phone, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5, now(), now())`,
    [params.user_id, params.school_id, params.driver_code, params.name ?? null, params.phone ?? null]
  );
}

export async function getSchoolById(id: string): Promise<{ id: string; school_code: string | null; name: string } | null> {
  const { rows } = await db.query(`SELECT id, school_code, name FROM schools WHERE id=$1`, [id]);
  return rows[0] ?? null;
}

export async function reserveUniqueCodeTx(client: PoolClient, code: string): Promise<boolean> {
  const { rows } = await client.query(`INSERT INTO unique_codes(code) VALUES($1) ON CONFLICT DO NOTHING RETURNING code`, [code]);
  return !!rows[0];
}

export async function deleteOtpsForEmailPurpose(email: string, purpose: 'email_verify' | 'password_reset'): Promise<void> {
  await db.query(`DELETE FROM otps WHERE email = $1 AND purpose = $2 AND consumed_at IS NULL`, [email, purpose]);
}

export async function isProfileVerified(userId: string, role: 'admin'|'parent'|'teacher'|'driver'): Promise<boolean> {
  let sql = '';
  switch (role) {
    case 'admin':
      sql = 'SELECT verified FROM schools WHERE user_id = $1 LIMIT 1';
      break;
    case 'parent':
      sql = 'SELECT verified FROM parents WHERE user_id = $1 LIMIT 1';
      break;
    case 'teacher':
      sql = 'SELECT verified FROM teachers WHERE user_id = $1 LIMIT 1';
      break;
    case 'driver':
      sql = 'SELECT verified FROM drivers WHERE user_id = $1 LIMIT 1';
      break;
  }
  const { rows } = await db.query(sql, [userId]);
  return rows[0]?.verified === true;
}

export async function listSchoolsMinimal(): Promise<Array<{ id: string; school_code: string | null; name: string }>> {
  const { rows } = await db.query(`SELECT id, school_code, name FROM schools ORDER BY name ASC`);
  return rows;
}

export async function getSchoolByUserId(userId: string): Promise<any | null> {
  const { rows } = await db.query(`SELECT id, user_id, school_code, name, phone, state, city, country, address, latitude, longitude, logo_url, verified, created_at, updated_at FROM schools WHERE user_id = $1 LIMIT 1`, [userId]);
  return rows[0] ?? null;
}

export async function getParentByUserId(userId: string): Promise<any | null> {
  const { rows } = await db.query(`SELECT id, user_id, school_id, parent_code, fullname, phone_number, nin, relationship, address, latitude, longitude, verified, created_at, updated_at FROM parents WHERE user_id = $1 LIMIT 1`, [userId]);
  return rows[0] ?? null;
}

export async function getTeacherByUserId(userId: string): Promise<any | null> {
  const { rows } = await db.query(`SELECT id, user_id, school_id, teacher_code, name, nin, gender, dob, nationality, state_of_origin, phone, passport_photo_url, verified, created_at, updated_at FROM teachers WHERE user_id = $1 LIMIT 1`, [userId]);
  return rows[0] ?? null;
}

export {};
