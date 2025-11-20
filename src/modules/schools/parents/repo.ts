import { db } from '../../shared/config/db.js';
import type { Parent } from './type.js';

export async function getParentById(parentId: string, schoolId: string): Promise<Parent | null> {
  const { rows } = await db.query(
    `SELECT p.id, p.user_id, p.school_id, p.parent_code, p.fullname, p.phone_number, p.nin, p.relationship, p.address, p.latitude, p.longitude, p.verified, p.created_at, p.updated_at, p.deleted_at
     FROM parents p
     WHERE p.id = $1 AND p.school_id = $2 AND (p.deleted_at IS NULL)
     LIMIT 1`,
    [parentId, schoolId]
  );
  return rows[0] ?? null;
}

export async function listParentsBySchool(schoolId: string, filter?: 'all' | 'verified' | 'unverified'): Promise<Parent[]> {
  let where = `p.school_id = $1 AND (p.deleted_at IS NULL)`;
  const params: any[] = [schoolId];
  if (filter === 'verified') {
    where += ` AND p.verified = true`;
  } else if (filter === 'unverified') {
    where += ` AND p.verified = false`;
  }
  const { rows } = await db.query(
    `SELECT p.id, p.user_id, p.school_id, p.parent_code, p.fullname, p.phone_number, p.nin, p.relationship, p.address, p.latitude, p.longitude, p.verified, p.created_at, p.updated_at, p.deleted_at
     FROM parents p
     WHERE ${where}
     ORDER BY p.created_at DESC`,
    params
  );
  return rows;
}

export async function softDeleteParent(parentId: string, schoolId: string): Promise<boolean> {
  const { rowCount } = await db.query(
    `UPDATE parents SET deleted_at = now() WHERE id = $1 AND school_id = $2 AND (deleted_at IS NULL)`,
    [parentId, schoolId]
  );
  return (rowCount ?? 0) > 0;
}

export async function updateParent(parentId: string, schoolId: string, updates: Partial<Partial<Parent>>): Promise<boolean> {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;
  if (updates.fullname !== undefined) { fields.push(`fullname = $${idx++}`); values.push(updates.fullname); }
  if (updates.phone_number !== undefined) { fields.push(`phone_number = $${idx++}`); values.push(updates.phone_number); }
  if (updates.nin !== undefined) { fields.push(`nin = $${idx++}`); values.push(updates.nin); }
  if (updates.relationship !== undefined) { fields.push(`relationship = $${idx++}`); values.push(updates.relationship); }
  if (updates.address !== undefined) { fields.push(`address = $${idx++}`); values.push(updates.address); }
  if (fields.length === 0) return false;
  values.push(parentId, schoolId);
  const sql = `UPDATE parents SET ${fields.join(', ')}, updated_at = now() WHERE id = $${idx++} AND school_id = $${idx++}`;
  const { rowCount } = await db.query(sql, values);
  return (rowCount ?? 0) > 0;
}

export async function setParentVerified(parentId: string, schoolId: string, verified: boolean): Promise<boolean> {
  const { rowCount } = await db.query(
    `UPDATE parents SET verified = $1, updated_at = now() WHERE id = $2 AND school_id = $3 AND (deleted_at IS NULL)`,
    [verified, parentId, schoolId]
  );
  return (rowCount ?? 0) > 0;
}
