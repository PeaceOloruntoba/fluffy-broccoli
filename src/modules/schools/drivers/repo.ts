import { db } from '../../shared/config/db.js';
import type { Driver } from './type.js';

export async function getDriverById(id: string, schoolId: string): Promise<Driver | null> {
  const { rows } = await db.query(
    `SELECT id, user_id, school_id, code, name, phone, created_at, updated_at, deleted_at
     FROM drivers WHERE id = $1 AND school_id = $2 AND (deleted_at IS NULL) LIMIT 1`,
    [id, schoolId]
  );
  return rows[0] ?? null;
}

export async function listDriversBySchool(schoolId: string): Promise<Driver[]> {
  const { rows } = await db.query(
    `SELECT id, user_id, school_id, code, name, phone, created_at, updated_at, deleted_at
     FROM drivers WHERE school_id = $1 AND (deleted_at IS NULL) ORDER BY created_at DESC`,
    [schoolId]
  );
  return rows;
}

export async function updateDriver(id: string, schoolId: string, updates: Partial<{ name: string | null; phone: string | null }>): Promise<boolean> {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;
  if (updates.name !== undefined) { fields.push(`name = $${idx++}`); values.push(updates.name); }
  if (updates.phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(updates.phone); }
  if (fields.length === 0) return false;
  values.push(id, schoolId);
  const sql = `UPDATE drivers SET ${fields.join(', ')}, updated_at = now() WHERE id = $${idx++} AND school_id = $${idx++} AND (deleted_at IS NULL)`;
  const { rowCount } = await db.query(sql, values);
  return (rowCount ?? 0) > 0;
}

export async function softDeleteDriver(id: string, schoolId: string): Promise<boolean> {
  const { rowCount } = await db.query(
    `UPDATE drivers SET deleted_at = now() WHERE id = $1 AND school_id = $2 AND (deleted_at IS NULL)`,
    [id, schoolId]
  );
  return (rowCount ?? 0) > 0;
}
