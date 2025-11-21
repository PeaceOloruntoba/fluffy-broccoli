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

export async function getTeacherWithClassAndStudents(teacherId: string, schoolId: string): Promise<any | null> {
  const { rows } = await db.query(
    `WITH t AS (
       SELECT id, user_id, school_id, teacher_code, name, nin, gender, dob, nationality, state_of_origin, phone, passport_photo_url, verified, created_at, updated_at
       FROM teachers WHERE id = $1 AND school_id = $2 AND deleted_at IS NULL
     ),
     link AS (
       SELECT tc.class_id FROM teacher_classes tc JOIN t ON tc.teacher_id = t.id WHERE tc.school_id = $2
     ),
     cls AS (
       SELECT c.id, c.name, c.code FROM classes c WHERE c.id = (SELECT class_id FROM link LIMIT 1)
     ),
     studs AS (
       SELECT s.id, s.name, s.reg_no, s.class_id, s.parent_user_id AS parent_id
       FROM students s WHERE s.class_id = (SELECT class_id FROM link LIMIT 1) AND s.school_id = $2 AND s.deleted_at IS NULL
     )
     SELECT (SELECT row_to_json(t) FROM t) AS teacher,
            (SELECT row_to_json(cls) FROM cls) AS class,
            (SELECT coalesce(json_agg(studs), '[]'::json) FROM studs) AS students;`,
    [teacherId, schoolId]
  );
  const r = rows[0];
  if (!r?.teacher) return null;
  return { ...r.teacher, class: r.class ?? null, students: r.students ?? [] };
}
