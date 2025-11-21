import { db } from '../../shared/config/db.js';
import type { Teacher } from './type.js';

export async function getTeacherById(id: string, schoolId: string): Promise<Teacher | null> {
  const { rows } = await db.query(
    `SELECT id, user_id, school_id, teacher_code, name, nin, gender, dob, nationality, state_of_origin, phone, passport_photo_url, verified, created_at, updated_at, deleted_at
     FROM teachers WHERE id = $1 AND school_id = $2 AND (deleted_at IS NULL) LIMIT 1`,
    [id, schoolId]
  );
  return rows[0] ?? null;
}

export async function listTeachersBySchool(schoolId: string): Promise<Teacher[]> {
  const { rows } = await db.query(
    `SELECT id, user_id, school_id, teacher_code, name, nin, gender, dob, nationality, state_of_origin, phone, passport_photo_url, verified, created_at, updated_at, deleted_at
     FROM teachers WHERE school_id = $1 AND (deleted_at IS NULL) ORDER BY created_at DESC`,
    [schoolId]
  );
  return rows;
}

export async function updateTeacher(id: string, schoolId: string, updates: Partial<{ name: string | null; nin: string | null; gender: 'male'|'female'|null; dob: string | null; nationality: string | null; state_of_origin: string | null; phone: string | null }>): Promise<boolean> {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;
  if (updates.name !== undefined) { fields.push(`name = $${idx++}`); values.push(updates.name); }
  if (updates.nin !== undefined) { fields.push(`nin = $${idx++}`); values.push(updates.nin); }
  if (updates.gender !== undefined) { fields.push(`gender = $${idx++}`); values.push(updates.gender); }
  if (updates.dob !== undefined) { fields.push(`dob = $${idx++}`); values.push(updates.dob); }
  if (updates.nationality !== undefined) { fields.push(`nationality = $${idx++}`); values.push(updates.nationality); }
  if (updates.state_of_origin !== undefined) { fields.push(`state_of_origin = $${idx++}`); values.push(updates.state_of_origin); }
  if (updates.phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(updates.phone); }
  if (fields.length === 0) return false;
  values.push(id, schoolId);
  const sql = `UPDATE teachers SET ${fields.join(', ')}, updated_at = now() WHERE id = $${idx++} AND school_id = $${idx++} AND (deleted_at IS NULL)`;
  const { rowCount } = await db.query(sql, values);
  return (rowCount ?? 0) > 0;
}

export async function softDeleteTeacher(id: string, schoolId: string): Promise<boolean> {
  const { rowCount } = await db.query(
    `UPDATE teachers SET deleted_at = now() WHERE id = $1 AND school_id = $2 AND (deleted_at IS NULL)`,
    [id, schoolId]
  );
  return (rowCount ?? 0) > 0;
}

export async function setTeacherVerified(id: string, schoolId: string, verified: boolean): Promise<boolean> {
  const { rowCount } = await db.query(
    `UPDATE teachers SET verified = $1, updated_at = now() WHERE id = $2 AND school_id = $3 AND (deleted_at IS NULL)`,
    [verified, id, schoolId]
  );
  return (rowCount ?? 0) > 0;
}

export async function upsertTeacherClass(schoolId: string, teacherId: string, classId: string): Promise<void> {
  await db.query(
    `INSERT INTO teacher_classes (school_id, teacher_id, class_id)
     VALUES ($1,$2,$3)
     ON CONFLICT (teacher_id) DO UPDATE SET class_id = EXCLUDED.class_id, updated_at = now()`,
    [schoolId, teacherId, classId]
  );
}

export async function deleteTeacherClass(schoolId: string, teacherId: string): Promise<void> {
  await db.query(
    `DELETE FROM teacher_classes WHERE school_id = $1 AND teacher_id = $2`,
    [schoolId, teacherId]
  );
}
