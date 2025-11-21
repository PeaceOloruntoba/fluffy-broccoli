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

export async function upsertDriverBus(schoolId: string, driverId: string, busId: string): Promise<void> {
  await db.query(
    `INSERT INTO driver_buses (school_id, driver_id, bus_id)
     VALUES ($1,$2,$3)
     ON CONFLICT (driver_id) DO UPDATE SET bus_id = EXCLUDED.bus_id, updated_at = now()`,
    [schoolId, driverId, busId]
  );
}

export async function deleteDriverBus(schoolId: string, driverId: string): Promise<void> {
  await db.query(
    `DELETE FROM driver_buses WHERE school_id = $1 AND driver_id = $2`,
    [schoolId, driverId]
  );
}

export async function getDriverWithBusAndStudents(driverId: string, schoolId: string): Promise<any | null> {
  const { rows } = await db.query(
    `WITH drv AS (
       SELECT d.id, d.user_id, d.school_id, d.code, d.name, d.phone, d.created_at, d.updated_at
       FROM drivers d WHERE d.id = $1 AND d.school_id = $2 AND d.deleted_at IS NULL
     ),
     link AS (
       SELECT db.bus_id FROM driver_buses db JOIN drv ON db.driver_id = drv.id WHERE db.school_id = $2
     ),
     bus AS (
       SELECT b.id, b.name, b.plate_number, b.code FROM buses b JOIN link l ON l.bus_id = b.id WHERE b.deleted_at IS NULL
     ),
     studs AS (
       SELECT s.id, s.name, s.reg_no, s.class_id, s.parent_user_id AS parent_id
       FROM student_buses sb
       JOIN students s ON s.id = sb.student_id
       WHERE sb.bus_id = (SELECT bus_id FROM link LIMIT 1) AND sb.school_id = $2 AND s.deleted_at IS NULL
     )
     SELECT (SELECT row_to_json(drv) FROM drv) AS driver,
            (SELECT row_to_json(bus) FROM bus) AS bus,
            (SELECT coalesce(json_agg(studs), '[]'::json) FROM studs) AS students;`,
    [driverId, schoolId]
  );
  const r = rows[0];
  if (!r?.driver) return null;
  return { ...r.driver, bus: r.bus ?? null, students: r.students ?? [] };
}
