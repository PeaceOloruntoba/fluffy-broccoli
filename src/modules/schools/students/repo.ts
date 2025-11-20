import { db } from '../../shared/config/db.js';
import type { Student } from './type.js';

export async function insertStudent(params: { school_id: string; name: string; reg_no?: string | null; class_id?: string | null; parent_user_id?: string | null }): Promise<Student> {
  const { rows } = await db.query(
    `INSERT INTO students (school_id, name, reg_no, class_id, parent_user_id)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, school_id, name, reg_no, class_id, parent_user_id as parent_id, created_at, updated_at, deleted_at`,
    [params.school_id, params.name, params.reg_no ?? null, params.class_id ?? null, params.parent_user_id ?? null]
  );
  return rows[0];
}

export async function bulkInsertStudents(rowsIn: Array<{ school_id: string; name: string; reg_no?: string | null; class_id?: string | null; parent_user_id?: string | null }>): Promise<number> {
  if (rowsIn.length === 0) return 0;
  const values: any[] = [];
  const chunks: string[] = [];
  let i = 1;
  for (const r of rowsIn) {
    chunks.push(`($${i++}, $${i++}, $${i++}, $${i++}, $${i++})`);
    values.push(r.school_id, r.name, r.reg_no ?? null, r.class_id ?? null, r.parent_user_id ?? null);
  }
  const sql = `INSERT INTO students (school_id, name, reg_no, class_id, parent_user_id) VALUES ${chunks.join(',')}`;
  const result = await db.query(sql, values);
  return result.rowCount ?? 0;
}

export async function getStudentById(id: string, schoolId: string): Promise<Student | null> {
  const { rows } = await db.query(
    `SELECT id, school_id, name, reg_no, class_id, parent_user_id as parent_id, created_at, updated_at, deleted_at
     FROM students WHERE id = $1 AND school_id = $2 AND (deleted_at IS NULL) LIMIT 1`,
    [id, schoolId]
  );
  return rows[0] ?? null;
}

export async function listStudentsBySchool(schoolId: string): Promise<Student[]> {
  const { rows } = await db.query(
    `SELECT id, school_id, name, reg_no, class_id, parent_user_id as parent_id, created_at, updated_at, deleted_at
     FROM students WHERE school_id = $1 AND (deleted_at IS NULL) ORDER BY created_at DESC`,
    [schoolId]
  );
  return rows;
}

export async function listStudentsByParent(parentUserId: string, schoolId?: string): Promise<Student[]> {
  const params: any[] = [parentUserId];
  let where = `parent_user_id = $1 AND (deleted_at IS NULL)`;
  if (schoolId) { where += ` AND school_id = $2`; params.push(schoolId); }
  const { rows } = await db.query(
    `SELECT id, school_id, name, reg_no, class_id, parent_user_id as parent_id, created_at, updated_at, deleted_at FROM students WHERE ${where} ORDER BY created_at DESC`,
    params
  );
  return rows;
}

export async function updateStudent(id: string, schoolId: string, updates: Partial<{ name: string | null; reg_no: string | null; class_id: string | null; parent_user_id: string | null }>): Promise<boolean> {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;
  if (updates.name !== undefined) { fields.push(`name = $${idx++}`); values.push(updates.name); }
  if (updates.reg_no !== undefined) { fields.push(`reg_no = $${idx++}`); values.push(updates.reg_no); }
  if (updates.class_id !== undefined) { fields.push(`class_id = $${idx++}`); values.push(updates.class_id); }
  if (updates.parent_user_id !== undefined) { fields.push(`parent_user_id = $${idx++}`); values.push(updates.parent_user_id); }
  if (fields.length === 0) return false;
  values.push(id, schoolId);
  const sql = `UPDATE students SET ${fields.join(', ')}, updated_at = now() WHERE id = $${idx++} AND school_id = $${idx++} AND (deleted_at IS NULL)`;
  const { rowCount } = await db.query(sql, values);
  return (rowCount ?? 0) > 0;
}

export async function softDeleteStudent(id: string, schoolId: string): Promise<boolean> {
  const { rowCount } = await db.query(
    `UPDATE students SET deleted_at = now() WHERE id = $1 AND school_id = $2 AND (deleted_at IS NULL)`,
    [id, schoolId]
  );
  return (rowCount ?? 0) > 0;
}
