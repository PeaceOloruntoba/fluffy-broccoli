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

export async function listStudentsBySchool(schoolId: string, classId?: string | null): Promise<Student[]> {
  const params: any[] = [schoolId];
  let where = `school_id = $1 AND (deleted_at IS NULL)`;
  if (classId) { where += ` AND class_id = $2`; params.push(classId); }
  const { rows } = await db.query(
    `SELECT id, school_id, name, reg_no, class_id, parent_user_id as parent_id, created_at, updated_at, deleted_at
     FROM students WHERE ${where} ORDER BY created_at DESC`,
    params
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

export async function upsertStudentBusesBulk(schoolId: string, busId: string, studentIds: string[]): Promise<number> {
  if (studentIds.length === 0) return 0;
  const values: any[] = [];
  const chunks: string[] = [];
  let i = 1;
  for (const sid of studentIds) {
    chunks.push(`($${i++}, $${i++}, $${i++})`);
    values.push(schoolId, sid, busId);
  }
  const sql = `INSERT INTO student_buses (school_id, student_id, bus_id)
               VALUES ${chunks.join(',')}
               ON CONFLICT (student_id) DO UPDATE SET bus_id = EXCLUDED.bus_id, updated_at = now()`;
  const result = await db.query(sql, values);
  return result.rowCount ?? 0;
}

export async function upsertStudentClassesBulk(schoolId: string, classId: string, studentIds: string[]): Promise<number> {
  if (studentIds.length === 0) return 0;
  const values: any[] = [];
  const chunks: string[] = [];
  let i = 1;
  for (const sid of studentIds) {
    chunks.push(`($${i++}, $${i++}, $${i++})`);
    values.push(schoolId, sid, classId);
  }
  const sql = `INSERT INTO student_classes (school_id, student_id, class_id)
               VALUES ${chunks.join(',')}
               ON CONFLICT (student_id) DO UPDATE SET class_id = EXCLUDED.class_id, updated_at = now()`;
  const result = await db.query(sql, values);
  return result.rowCount ?? 0;
}

export async function updateStudentsClassBulk(schoolId: string, classId: string, studentIds: string[]): Promise<number> {
  if (studentIds.length === 0) return 0;
  const params: any[] = [classId, schoolId];
  const inParams: string[] = [];
  let i = 3;
  for (const sid of studentIds) { inParams.push(`$${i++}`); params.push(sid); }
  const sql = `UPDATE students SET class_id = $1, updated_at = now()
               WHERE school_id = $2 AND id IN (${inParams.join(',')}) AND deleted_at IS NULL`;
  const result = await db.query(sql, params);
  return result.rowCount ?? 0;
}

export async function getStudentByIdWithParent(id: string, schoolId: string): Promise<any | null> {
  const { rows } = await db.query(
    `SELECT 
       s.id, s.school_id, s.name, s.reg_no, s.class_id, s.parent_user_id as parent_id, s.created_at, s.updated_at, s.deleted_at,
       p.id as parent_profile_id, p.parent_code as parent_code, p.fullname as parent_fullname, p.phone_number as parent_phone_number,
       u.email as parent_email, u.name as parent_user_name
     FROM students s
     LEFT JOIN parents p ON p.user_id = s.parent_user_id AND p.school_id = s.school_id
     LEFT JOIN users u ON u.id = s.parent_user_id
     WHERE s.id = $1 AND s.school_id = $2 AND (s.deleted_at IS NULL)
     LIMIT 1`,
    [id, schoolId]
  );
  return rows[0] ?? null;
}

export async function softDeleteStudent(id: string, schoolId: string): Promise<boolean> {
  const { rowCount } = await db.query(
    `UPDATE students SET deleted_at = now() WHERE id = $1 AND school_id = $2 AND (deleted_at IS NULL)`,
    [id, schoolId]
  );
  return (rowCount ?? 0) > 0;
}

export async function updateStudentForParent(id: string, parentUserId: string, updates: Partial<{ name: string | null; reg_no: string | null; class_id: string | null }>): Promise<boolean> {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;
  if (updates.name !== undefined) { fields.push(`name = $${idx++}`); values.push(updates.name); }
  if (updates.reg_no !== undefined) { fields.push(`reg_no = $${idx++}`); values.push(updates.reg_no); }
  if (updates.class_id !== undefined) { fields.push(`class_id = $${idx++}`); values.push(updates.class_id); }
  if (fields.length === 0) return false;
  values.push(id, parentUserId);
  const sql = `UPDATE students SET ${fields.join(', ')}, updated_at = now() WHERE id = $${idx++} AND parent_user_id = $${idx++} AND (deleted_at IS NULL)`;
  const { rowCount } = await db.query(sql, values);
  return (rowCount ?? 0) > 0;
}

export async function softDeleteStudentForParent(id: string, parentUserId: string): Promise<boolean> {
  const { rowCount } = await db.query(
    `UPDATE students SET deleted_at = now() WHERE id = $1 AND parent_user_id = $2 AND (deleted_at IS NULL)`,
    [id, parentUserId]
  );
  return (rowCount ?? 0) > 0;
}
