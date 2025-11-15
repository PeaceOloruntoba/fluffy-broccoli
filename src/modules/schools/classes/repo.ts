import { db } from '../../shared/config/db.js';
import type { Class } from './type.js';

export async function createClass(params: { name: string; code: string; school_id: string; school_user_id: string }): Promise<Class> {
  const { rows } = await db.query(
    `INSERT INTO classes (name, code, school_id, school_user_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, code, school_id, school_user_id, created_at, updated_at`,
    [params.name, params.code, params.school_id, params.school_user_id]
  );
  return rows[0];
}

export async function deleteClass(id: string, school_user_id: string): Promise<boolean> {
  // Ensure deletion is only for classes belonging to the school_user
  const { rowCount } = await db.query(
    `DELETE FROM classes WHERE id = $1 AND school_user_id = $2`,
    [id, school_user_id]
  );
  return (rowCount ?? 0) > 0;
}

export async function getClassesBySchoolId(school_id: string): Promise<Class[]> {
  const { rows } = await db.query(
    `SELECT id, name, code, school_id, school_user_id, created_at, updated_at
     FROM classes
     WHERE school_id = $1
     ORDER BY created_at ASC`,
    [school_id]
  );
  return rows;
}

export async function getClassById(id: string): Promise<Class | null> {
  const { rows } = await db.query(
    `SELECT id, name, code, school_id, school_user_id, created_at, updated_at
     FROM classes
     WHERE id = $1
     LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}
