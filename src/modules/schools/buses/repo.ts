import { db } from '../../shared/config/db.js';
import type { Bus } from './type.js';

export async function insertBus(params: { school_id: string; name?: string | null; plate_number?: string | null; code: string }): Promise<Bus> {
  const { rows } = await db.query(
    `INSERT INTO buses (school_id, name, plate_number, code)
     VALUES ($1,$2,$3,$4)
     RETURNING id, school_id, name, plate_number, code, created_at, updated_at, deleted_at`,
    [params.school_id, params.name ?? null, params.plate_number ?? null, params.code]
  );
  return rows[0];
}

export async function getBusById(id: string, schoolId: string): Promise<Bus | null> {
  const { rows } = await db.query(
    `SELECT id, school_id, name, plate_number, code, created_at, updated_at, deleted_at
     FROM buses WHERE id = $1 AND school_id = $2 AND (deleted_at IS NULL) LIMIT 1`,
    [id, schoolId]
  );
  return rows[0] ?? null;
}

export async function listBusesBySchool(schoolId: string): Promise<Bus[]> {
  const { rows } = await db.query(
    `SELECT id, school_id, name, plate_number, code, created_at, updated_at, deleted_at
     FROM buses WHERE school_id = $1 AND (deleted_at IS NULL) ORDER BY created_at DESC`,
    [schoolId]
  );
  return rows;
}

export async function updateBus(id: string, schoolId: string, updates: Partial<{ name: string | null; plate_number: string | null }>): Promise<boolean> {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;
  if (updates.name !== undefined) { fields.push(`name = $${idx++}`); values.push(updates.name); }
  if (updates.plate_number !== undefined) { fields.push(`plate_number = $${idx++}`); values.push(updates.plate_number); }
  if (fields.length === 0) return false;
  values.push(id, schoolId);
  const sql = `UPDATE buses SET ${fields.join(', ')}, updated_at = now() WHERE id = $${idx++} AND school_id = $${idx++} AND (deleted_at IS NULL)`;
  const { rowCount } = await db.query(sql, values);
  return (rowCount ?? 0) > 0;
}

export async function getBusWithDriverAndStudents(busId: string, schoolId: string): Promise<any | null> {
  const { rows } = await db.query(
    `WITH bus AS (
       SELECT b.id, b.school_id, b.name, b.plate_number, b.code, b.created_at, b.updated_at
       FROM buses b WHERE b.id = $1 AND b.school_id = $2 AND b.deleted_at IS NULL
     ),
     drv AS (
       SELECT d.id, d.user_id, d.code, d.name, d.phone
       FROM driver_buses db JOIN drivers d ON d.id = db.driver_id
       WHERE db.bus_id = (SELECT id FROM bus) AND db.school_id = $2 AND d.deleted_at IS NULL
       LIMIT 1
     ),
     studs AS (
       SELECT s.id, s.name, s.reg_no, s.class_id, s.parent_user_id AS parent_id
       FROM student_buses sb JOIN students s ON s.id = sb.student_id
       WHERE sb.bus_id = (SELECT id FROM bus) AND sb.school_id = $2 AND s.deleted_at IS NULL
     )
     SELECT (SELECT row_to_json(bus) FROM bus) AS bus,
            (SELECT row_to_json(drv) FROM drv) AS driver,
            (SELECT coalesce(json_agg(studs), '[]'::json) FROM studs) AS students;`,
    [busId, schoolId]
  );
  const r = rows[0];
  if (!r?.bus) return null;
  return { ...r.bus, driver: r.driver ?? null, students: r.students ?? [] };
}

export async function softDeleteBus(id: string, schoolId: string): Promise<boolean> {
  const { rowCount } = await db.query(
    `UPDATE buses SET deleted_at = now() WHERE id = $1 AND school_id = $2 AND (deleted_at IS NULL)`,
    [id, schoolId]
  );
  return (rowCount ?? 0) > 0;
}
