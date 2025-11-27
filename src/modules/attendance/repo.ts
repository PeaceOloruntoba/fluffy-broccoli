import { db } from '../shared/config/db.js';

export type AttendanceEntry = { student_id: string; status?: 'present'|'absent'|'late'; note?: string | null; date?: string | null };

export async function getAdminSchoolId(userId: string): Promise<string | null> {
  const { rows } = await db.query(`SELECT id FROM schools WHERE user_id = $1 LIMIT 1`, [userId]);
  return rows[0]?.id ?? null;
}

export async function filterStudentsBySchool(schoolId: string, studentIds: string[]): Promise<Set<string>> {
  if (studentIds.length === 0) return new Set();
  const { rows } = await db.query(
    `SELECT id FROM students WHERE school_id = $1 AND deleted_at IS NULL AND id = ANY($2::uuid[])`,
    [schoolId, studentIds]
  );
  return new Set(rows.map(r => r.id as string));
}

export async function filterStudentsByClass(schoolId: string, classId: string, studentIds: string[]): Promise<Set<string>> {
  if (studentIds.length === 0) return new Set();
  const { rows } = await db.query(
    `SELECT id FROM students WHERE school_id = $1 AND class_id = $2 AND deleted_at IS NULL AND id = ANY($3::uuid[])`,
    [schoolId, classId, studentIds]
  );
  return new Set(rows.map(r => r.id as string));
}

export async function filterStudentsByBus(schoolId: string, busId: string, studentIds: string[]): Promise<Set<string>> {
  if (studentIds.length === 0) return new Set();
  const { rows } = await db.query(
    `SELECT s.id
     FROM student_buses sb
     JOIN students s ON s.id = sb.student_id
     WHERE sb.school_id = $1 AND sb.bus_id = $2 AND s.deleted_at IS NULL AND s.id = ANY($3::uuid[])`,
    [schoolId, busId, studentIds]
  );
  return new Set(rows.map(r => r.id as string));
}

export async function getTeacherScope(userId: string): Promise<{ school_id: string | null; class_id: string | null }> {
  const { rows } = await db.query(
    `SELECT t.school_id, tc.class_id
     FROM teachers t
     LEFT JOIN teacher_classes tc ON tc.teacher_id = t.id
     WHERE t.user_id = $1
     LIMIT 1`,
    [userId]
  );
  const r = rows[0];
  return { school_id: r?.school_id ?? null, class_id: r?.class_id ?? null };
}

export async function getDriverScope(userId: string): Promise<{ school_id: string | null; bus_id: string | null }> {
  const { rows } = await db.query(
    `SELECT d.school_id, db.bus_id
     FROM drivers d
     LEFT JOIN driver_buses db ON db.driver_id = d.id
     WHERE d.user_id = $1
     LIMIT 1`,
    [userId]
  );
  const r = rows[0];
  return { school_id: r?.school_id ?? null, bus_id: r?.bus_id ?? null };
}

export async function listSchoolAttendance(params: { role: string; user_id: string; school_id?: string | null; date?: string | null; class_id?: string | null; student_id?: string | null }) {
  const { role, user_id } = params;
  let where: string[] = [];
  const values: any[] = [];

  // Scope by role
  if (role === 'superadmin') {
    if (params.school_id) { where.push(`a.school_id = $${values.push(params.school_id)}`); }
  } else if (role === 'admin') {
    const schoolId = await getAdminSchoolId(user_id);
    if (!schoolId) return [];
    where.push(`a.school_id = $${values.push(schoolId)}`);
  } else if (role === 'teacher') {
    const { school_id, class_id } = await getTeacherScope(user_id);
    if (!school_id || !class_id) return [];
    where.push(`a.school_id = $${values.push(school_id)}`);
    where.push(`s.class_id = $${values.push(class_id)}`);
  } else if (role === 'driver') {
    const { school_id, bus_id } = await getDriverScope(user_id);
    if (!school_id || !bus_id) return [];
    where.push(`a.school_id = $${values.push(school_id)}`);
    where.push(`sb.bus_id = $${values.push(bus_id)}`);
  } else if (role === 'parent') {
    // parent can only see their own child
    where.push(`u.id = $${values.push(user_id)}`);
  } else {
    return [];
  }

  if (params.date) where.push(`a.attendance_date = $${values.push(params.date)}`);
  if (params.class_id) where.push(`s.class_id = $${values.push(params.class_id)}`);
  if (params.student_id) where.push(`a.student_id = $${values.push(params.student_id)}`);

  const sql = `
    SELECT 
      a.id,
      a.school_id,
      a.student_id,
      a.class_id,
      a.status,
      a.note,
      a.attendance_date,
      a.taken_at,
      a.taken_by_user_id,
      a.taken_by_role,
      s.parent_user_id AS parent_id,
      s.class_id AS student_class_id,
      s.name AS student_name,
      sb.bus_id AS bus_id,
      b.name AS bus_name,
      c.name AS class_name
    FROM school_attendance a
    JOIN students s ON s.id = a.student_id
    LEFT JOIN student_buses sb ON sb.student_id = s.id AND sb.school_id = a.school_id
    LEFT JOIN buses b ON b.id = sb.bus_id
    LEFT JOIN classes c ON c.id = a.class_id
    LEFT JOIN users u ON u.id = s.parent_user_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY a.attendance_date DESC, a.taken_at DESC
  `;
  const { rows } = await db.query(sql, values);
  return rows;
}

export async function listBusAttendance(params: { role: string; user_id: string; school_id?: string | null; date?: string | null; bus_id?: string | null; student_id?: string | null }) {
  const { role, user_id } = params;
  let where: string[] = [];
  const values: any[] = [];

  if (role === 'superadmin') {
    if (params.school_id) { where.push(`a.school_id = $${values.push(params.school_id)}`); }
  } else if (role === 'admin') {
    const schoolId = await getAdminSchoolId(user_id);
    if (!schoolId) return [];
    where.push(`a.school_id = $${values.push(schoolId)}`);
  } else if (role === 'driver') {
    const { school_id, bus_id } = await getDriverScope(user_id);
    if (!school_id || !bus_id) return [];
    where.push(`a.school_id = $${values.push(school_id)}`);
    where.push(`a.bus_id = $${values.push(bus_id)}`);
  } else if (role === 'teacher') {
    const { school_id, class_id } = await getTeacherScope(user_id);
    if (!school_id || !class_id) return [];
    where.push(`a.school_id = $${values.push(school_id)}`);
    where.push(`s.class_id = $${values.push(class_id)}`);
  } else if (role === 'parent') {
    where.push(`u.id = $${values.push(user_id)}`);
  } else { return []; }

  if (params.date) where.push(`a.attendance_date = $${values.push(params.date)}`);
  if (params.bus_id) where.push(`a.bus_id = $${values.push(params.bus_id)}`);
  if (params.student_id) where.push(`a.student_id = $${values.push(params.student_id)}`);

  const sql = `
    SELECT 
      a.id,
      a.school_id,
      a.student_id,
      a.bus_id,
      a.status,
      a.note,
      a.attendance_date,
      a.taken_at,
      a.taken_by_user_id,
      a.taken_by_role,
      s.parent_user_id AS parent_id,
      s.class_id AS class_id,
      s.name AS student_name,
      b.name AS bus_name,
      c.name AS class_name
    FROM bus_attendance a
    JOIN students s ON s.id = a.student_id
    LEFT JOIN buses b ON b.id = a.bus_id
    LEFT JOIN classes c ON c.id = s.class_id
    LEFT JOIN users u ON u.id = s.parent_user_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY a.attendance_date DESC, a.taken_at DESC
  `;
  const { rows } = await db.query(sql, values);
  return rows;
}

export async function upsertSchoolAttendance(schoolId: string, takenByUserId: string, takenByRole: string, entries: AttendanceEntry[]): Promise<number> {
  if (entries.length === 0) return 0;
  const values: any[] = [];
  const rowsSql: string[] = [];
  let idx = 1;
  for (const e of entries) {
    const status = e.status ?? 'present';
    const note = e.note ?? null;
    const date = e.date ? e.date : null;
    rowsSql.push(`($${idx++}, $${idx++}, COALESCE($${idx++}::date, now()::date), $${idx++}, $${idx++}, $${idx++})`);
    values.push(e.student_id, schoolId, date, status, note, takenByUserId);
  }
  const sql = `
    WITH v(student_id, school_id, attendance_date, status, note, taken_by_user_id) AS (
      VALUES ${rowsSql.join(',')}
    ),
    resolved AS (
      SELECT (v.student_id)::uuid AS student_id,
             (v.school_id)::uuid AS school_id,
             v.attendance_date,
             v.status,
             v.note,
             (v.taken_by_user_id)::uuid AS taken_by_user_id,
             s.class_id
      FROM v
      JOIN students s ON s.id = (v.student_id)::uuid AND s.school_id = (v.school_id)::uuid
    )
    INSERT INTO school_attendance (student_id, school_id, class_id, attendance_date, status, note, taken_by_user_id, taken_by_role)
    SELECT r.student_id, r.school_id, r.class_id, r.attendance_date, (r.status)::attendance_status, r.note, r.taken_by_user_id, $${values.push(takenByRole)}::user_role
    FROM resolved r
    ON CONFLICT (student_id, attendance_date)
    DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note, class_id = EXCLUDED.class_id, taken_by_user_id = EXCLUDED.taken_by_user_id, taken_by_role = EXCLUDED.taken_by_role, updated_at = now()
    RETURNING 1`;
  const { rowCount } = await db.query(sql, values);
  return rowCount ?? 0;
}

export async function upsertBusAttendance(schoolId: string, takenByUserId: string, takenByRole: string, entries: AttendanceEntry[], driverBusId?: string | null, tripId?: string | null): Promise<number> {
  if (entries.length === 0) return 0;
  // Determine bus_id per student: prefer student's assigned bus in student_buses; fallback to driver's bus if provided
  const values: any[] = [];
  const rowsSql: string[] = [];
  let idx = 1;
  for (const e of entries) {
    const status = e.status ?? 'present';
    const note = e.note ?? null;
    const date = e.date ? e.date : null;
    rowsSql.push(`($${idx++}, $${idx++}, COALESCE($${idx++}::date, now()::date), $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
    values.push(e.student_id, schoolId, date, status, note, takenByUserId, tripId ?? null);
  }
  const sql = `
    WITH v(student_id, school_id, attendance_date, status, note, taken_by_user_id) AS (
      VALUES ${rowsSql.join(',')}
    ),
    resolved AS (
      SELECT (v.student_id)::uuid AS student_id,
             (v.school_id)::uuid AS school_id,
             v.attendance_date,
             v.status,
             v.note,
             (v.taken_by_user_id)::uuid AS taken_by_user_id,
             COALESCE(sb.bus_id, $${values.push(driverBusId ?? null)}::uuid) AS bus_id
      FROM v
      LEFT JOIN student_buses sb ON sb.student_id = (v.student_id)::uuid AND sb.school_id = (v.school_id)::uuid
    )
    INSERT INTO bus_attendance (student_id, school_id, bus_id, attendance_date, status, note, taken_by_user_id, taken_by_role, trip_id)
    SELECT r.student_id, r.school_id, r.bus_id, r.attendance_date, (r.status)::attendance_status, r.note, r.taken_by_user_id, $${values.push(takenByRole)}::user_role, $${values.push(tripId ?? null)}::uuid
    FROM resolved r
    ON CONFLICT (student_id, trip_id)
    DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note, bus_id = EXCLUDED.bus_id, taken_by_user_id = EXCLUDED.taken_by_user_id, taken_by_role = EXCLUDED.taken_by_role, attendance_date = EXCLUDED.attendance_date, updated_at = now()
    RETURNING 1`;
  const { rowCount } = await db.query(sql, values);
  return rowCount ?? 0;
}

