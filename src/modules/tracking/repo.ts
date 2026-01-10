import { db } from '../shared/config/db.js';

export type TripDirection = 'pickup'|'dropoff';

export async function getDriverScopeByUser(userId: string): Promise<{ school_id: string; driver_id: string; bus_id: string } | null> {
  const { rows } = await db.query(
    `SELECT d.school_id, d.id AS driver_id, db.bus_id
     FROM drivers d
     LEFT JOIN driver_buses db ON db.driver_id = d.id
     WHERE d.user_id = $1 AND d.deleted_at IS NULL
     LIMIT 1`,
    [userId]
  );
  if (!rows[0]?.school_id || !rows[0]?.driver_id || !rows[0]?.bus_id) return null;
  return rows[0];
}

export async function getParentForTarget(trip_id: string, target_id: string): Promise<{ parent_user_id: string | null; student_name: string | null; school_id: string | null } | null> {
  const { rows } = await db.query(
    `SELECT s.parent_user_id, s.name as student_name, t.school_id
     FROM trip_targets tt
     JOIN trips t ON t.id = tt.trip_id
     JOIN students s ON s.id = tt.student_id
     WHERE tt.trip_id = $1 AND tt.id = $2
     LIMIT 1`,
    [trip_id, target_id]
  );
  return rows[0] ?? null;
}

export async function getAdminUserIdBySchool(school_id: string): Promise<string | null> {
  const { rows } = await db.query(`SELECT user_id FROM schools WHERE id = $1 LIMIT 1`, [school_id]);
  return rows[0]?.user_id ?? null;
}

export async function getDriverUserIdByDriverId(driver_id: string): Promise<string | null> {
  const { rows } = await db.query(`SELECT user_id FROM drivers WHERE id = $1 LIMIT 1`, [driver_id]);
  return rows[0]?.user_id ?? null;
}

export async function listTeacherUserIdsBySchool(school_id: string): Promise<string[]> {
  const { rows } = await db.query(`SELECT user_id FROM teachers WHERE school_id = $1 AND deleted_at IS NULL`, [school_id]);
  return rows.map(r => r.user_id as string);
}

export async function getSchoolCoords(schoolId: string): Promise<{ latitude: number; longitude: number } | null> {
  const { rows } = await db.query(`SELECT latitude, longitude FROM schools WHERE id = $1`, [schoolId]);
  const r = rows[0];
  if (r?.latitude == null || r?.longitude == null) return null;
  return { latitude: Number(r.latitude), longitude: Number(r.longitude) };
}

export async function getTripTargetsForOrdering(tripId: string): Promise<Array<{ id: string; student_id: string; lat: number; lng: number; name: string }>> {
  const { rows } = await db.query(
    `SELECT tt.id, tt.student_id, COALESCE(tt.target_lat, p.latitude, s.latitude) AS lat, COALESCE(tt.target_lng, p.longitude, s.longitude) AS lng, s.name
     FROM trip_targets tt
     JOIN students s ON s.id = tt.student_id
     LEFT JOIN parents p ON p.user_id = s.parent_user_id AND p.school_id = s.school_id
     WHERE tt.trip_id = $1 AND tt.status = 'pending'`,
    [tripId]
  );
  return rows.map(r => ({ id: r.id, student_id: r.student_id, lat: Number(r.lat), lng: Number(r.lng), name: r.name }));
}

export async function bulkUpdateTargetOrder(tripId: string, ordered: Array<{ id: string; order_index: number }>): Promise<void> {
  if (ordered.length === 0) return;
  const values: any[] = [];
  const rows: string[] = [];
  let i = 1;
  for (const o of ordered) {
    rows.push(`($${i++}::uuid, $${i++}::int)`);
    values.push(o.id, o.order_index);
  }
  const sql = `UPDATE trip_targets t SET order_index = v.order_index, updated_at = now()
               FROM (VALUES ${rows.join(',')}) AS v(id, order_index)
               WHERE t.id = v.id AND t.trip_id = $${values.push(tripId)}::uuid`;
  await db.query(sql, values);
}

export async function getAdminSchoolId(userId: string): Promise<string | null> {
  const { rows } = await db.query(`SELECT id FROM schools WHERE user_id = $1 LIMIT 1`, [userId]);
  return rows[0]?.id ?? null;
}

export async function createTripWithTargets(params: { school_id: string; bus_id: string; driver_id: string; direction: TripDirection; route_name?: string | null; started_by_user_id: string }): Promise<{ trip_id: string }> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { rows: tripRows } = await client.query(
      `INSERT INTO trips (school_id, bus_id, driver_id, direction, status, route_name, start_time, started_by_user_id)
       VALUES ($1,$2,$3,$4,'running',$5, now(), $6)
       RETURNING id`,
      [params.school_id, params.bus_id, params.driver_id, params.direction, params.route_name ?? null, params.started_by_user_id]
    );
    const tripId: string = tripRows[0].id;
    // Seed targets from student_buses
    const targetKind = params.direction === 'pickup' ? 'home' : 'home';
    await client.query(
      `INSERT INTO trip_targets (trip_id, student_id, target_kind, target_lat, target_lng, status)
       SELECT $1::uuid AS trip_id, s.id AS student_id, $2::trip_target_kind, p.latitude, p.longitude, 'pending'
       FROM student_buses sb
       JOIN students s ON s.id = sb.student_id AND s.school_id = $3 AND s.deleted_at IS NULL
       LEFT JOIN parents p ON p.user_id = s.parent_user_id AND p.school_id = $3
       WHERE sb.school_id = $3 AND sb.bus_id = $4`,
      [tripId, targetKind, params.school_id, params.bus_id]
    );
    // Start event
    await client.query(
      `INSERT INTO trip_events (trip_id, type, occurred_at, meta) VALUES ($1,'start', now(), $2)`,
      [tripId, { direction: params.direction } as any]
    );
    await client.query('COMMIT');
    return { trip_id: tripId };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function insertLocations(params: { trip_id: string; points: Array<{ lat: number; lng: number; recorded_at?: string | null; speed_kph?: number | null; heading?: number | null; accuracy_m?: number | null }> }): Promise<number> {
  if (params.points.length === 0) return 0;
  const values: any[] = [];
  const rows: string[] = [];
  let i = 1;
  for (const p of params.points) {
    rows.push(`($${i++}::uuid, COALESCE($${i++}::timestamptz, now()), $${i++}::double precision, $${i++}::double precision, $${i++}::double precision, $${i++}::double precision, $${i++}::double precision)`);
    values.push(params.trip_id, p.recorded_at ?? null, p.lat, p.lng, p.speed_kph ?? null, p.heading ?? null, p.accuracy_m ?? null);
  }
  const sql = `INSERT INTO trip_locations (trip_id, recorded_at, lat, lng, speed_kph, heading, accuracy_m)
               VALUES ${rows.join(',')}`;
  const { rowCount } = await db.query(sql, values);
  return rowCount ?? 0;
}

export async function patchTargetStatus(params: { trip_id: string; target_id: string; status: 'picked'|'dropped'|'skipped' }): Promise<boolean> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { rowCount } = await client.query(
      `UPDATE trip_targets SET status = $1::trip_target_status, acted_at = now(), updated_at = now()
       WHERE id = $2 AND trip_id = $3`,
      [params.status, params.target_id, params.trip_id]
    );
    if ((rowCount ?? 0) > 0) {
      await client.query(`INSERT INTO trip_events (trip_id, type, meta) VALUES ($1, $2::trip_event_type, $3)`, [params.trip_id, params.status as any, { target_id: params.target_id } as any]);
    }
    await client.query('COMMIT');
    return (rowCount ?? 0) > 0;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally { client.release(); }
}

export async function setTripEnded(params: { trip_id: string; ended_by_user_id: string }): Promise<void> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE trips SET status = 'ended', end_time = now(), ended_by_user_id = $2, updated_at = now() WHERE id = $1`, [params.trip_id, params.ended_by_user_id]);
    await client.query(`INSERT INTO trip_events (trip_id, type) VALUES ($1,'end')`, [params.trip_id]);
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}

export async function findRunningTripForBus(schoolId: string, busId: string): Promise<{ id: string } | null> {
  const { rows } = await db.query(`SELECT id FROM trips WHERE school_id = $1 AND bus_id = $2 AND status = 'running' LIMIT 1`, [schoolId, busId]);
  return rows[0] ?? null;
}

export async function findRunningTripForDriverUser(userId: string): Promise<{ id: string; school_id: string; bus_id: string; driver_id: string; direction: TripDirection } | null> {
  const { rows } = await db.query(
    `SELECT t.id, t.school_id, t.bus_id, t.driver_id, t.direction
     FROM trips t
     JOIN drivers d ON d.id = t.driver_id AND d.user_id = $1
     WHERE t.status = 'running'
     ORDER BY t.start_time DESC
     LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
}

export async function getTripByIdSimple(tripId: string): Promise<{ id: string; school_id: string; bus_id: string; driver_id: string; direction: TripDirection; status: string } | null> {
  const { rows } = await db.query(`SELECT id, school_id, bus_id, driver_id, direction, status FROM trips WHERE id = $1 LIMIT 1`, [tripId]);
  return rows[0] ?? null;
}

export async function listTripTargetsSummary(tripId: string): Promise<Array<{ target_id: string; student_id: string; name: string; status: string; order_index: number | null }>> {
  const { rows } = await db.query(
    `SELECT tt.id AS target_id, tt.student_id, s.name, tt.status, tt.order_index
     FROM trip_targets tt JOIN students s ON s.id = tt.student_id
     WHERE tt.trip_id = $1
     ORDER BY COALESCE(tt.order_index, 999999) ASC, tt.created_at ASC`,
    [tripId]
  );
  return rows.map(r => ({ target_id: r.target_id, student_id: r.student_id, name: r.name, status: r.status, order_index: r.order_index ?? null }));
}

export async function listTripTargetsWithCoords(tripId: string): Promise<Array<{ target_id: string; student_id: string; name: string; status: string; order_index: number | null; lat: number | null; lng: number | null }>> {
  const { rows } = await db.query(
    `SELECT tt.id AS target_id, tt.student_id, s.name, tt.status, tt.order_index,
            COALESCE(tt.target_lat, p.latitude, s.latitude) AS lat,
            COALESCE(tt.target_lng, p.longitude, s.longitude) AS lng
     FROM trip_targets tt
     JOIN students s ON s.id = tt.student_id
     LEFT JOIN parents p ON p.user_id = s.parent_user_id AND p.school_id = s.school_id
     WHERE tt.trip_id = $1
     ORDER BY COALESCE(tt.order_index, 999999) ASC, tt.created_at ASC`,
    [tripId]
  );
  return rows.map(r => ({
    target_id: r.target_id,
    student_id: r.student_id,
    name: r.name,
    status: r.status,
    order_index: r.order_index ?? null,
    lat: r.lat == null ? null : Number(r.lat),
    lng: r.lng == null ? null : Number(r.lng)
  }));
}

export async function getTripBusLatestLocation(tripId: string): Promise<{ lat: number; lng: number; recorded_at: string | null } | null> {
  const { rows } = await db.query(
    `SELECT tl.lat, tl.lng, tl.recorded_at
     FROM trip_locations tl
     WHERE tl.trip_id = $1
     ORDER BY tl.recorded_at DESC
     LIMIT 1`,
    [tripId]
  );
  const r = rows[0];
  if (!r) return null;
  return { lat: Number(r.lat), lng: Number(r.lng), recorded_at: r.recorded_at ?? null };
}

export async function listTripsByDriverUser(userId: string, opts: { status?: string; direction?: string; cursor?: string | null; limit?: number }): Promise<any[]> {
  const params: any[] = [userId];
  let i = params.length + 1;
  let where = `t.driver_id = (SELECT id FROM drivers WHERE user_id = $1 LIMIT 1)`;
  if (opts.status) { where += ` AND t.status = $${i++}::trip_status`; params.push(opts.status); }
  if (opts.direction) { where += ` AND t.direction = $${i++}::trip_direction`; params.push(opts.direction); }
  if (opts.cursor) { where += ` AND t.created_at < (SELECT created_at FROM trips WHERE id = $${i++})`; params.push(opts.cursor); }
  const limit = Math.max(1, Math.min(opts.limit ?? 20, 100));
  const { rows } = await db.query(
    `SELECT t.id, t.school_id, t.bus_id, t.driver_id, t.direction, t.status, t.route_name, t.start_time, t.end_time
     FROM trips t WHERE ${where} ORDER BY t.created_at DESC LIMIT ${limit}`,
    params
  );
  return rows;
}

export async function listTripsBySchoolUser(userId: string, opts: { status?: string; direction?: string; cursor?: string | null; limit?: number }): Promise<any[]> {
  const params: any[] = [userId];
  let i = params.length + 1;
  let where = `t.school_id = (SELECT id FROM schools WHERE user_id = $1 LIMIT 1)`;
  if (opts.status) { where += ` AND t.status = $${i++}::trip_status`; params.push(opts.status); }
  if (opts.direction) { where += ` AND t.direction = $${i++}::trip_direction`; params.push(opts.direction); }
  if (opts.cursor) { where += ` AND t.created_at < (SELECT created_at FROM trips WHERE id = $${i++})`; params.push(opts.cursor); }
  const limit = Math.max(1, Math.min(opts.limit ?? 20, 100));
  const { rows } = await db.query(
    `SELECT t.id, t.school_id, t.bus_id, t.driver_id, t.direction, t.status, t.route_name, t.start_time, t.end_time
     FROM trips t WHERE ${where} ORDER BY t.created_at DESC LIMIT ${limit}`,
    params
  );
  return rows;
}

export async function listTripsByParentUser(userId: string, opts: { status?: string; direction?: string; cursor?: string | null; limit?: number }): Promise<any[]> {
  const params: any[] = [userId];
  let i = params.length + 1;
  let where = `EXISTS (
    SELECT 1 FROM trip_targets tt
    JOIN students s ON s.id = tt.student_id
    WHERE tt.trip_id = t.id AND s.parent_user_id = $1
  )`;
  if (opts.status) { where += ` AND t.status = $${i++}::trip_status`; params.push(opts.status); }
  if (opts.direction) { where += ` AND t.direction = $${i++}::trip_direction`; params.push(opts.direction); }
  if (opts.cursor) { where += ` AND t.created_at < (SELECT created_at FROM trips WHERE id = $${i++})`; params.push(opts.cursor); }
  const limit = Math.max(1, Math.min(opts.limit ?? 20, 100));
  const { rows } = await db.query(
    `SELECT t.id, t.school_id, t.bus_id, t.driver_id, t.direction, t.status, t.route_name, t.start_time, t.end_time
     FROM trips t WHERE ${where} ORDER BY t.created_at DESC LIMIT ${limit}`,
    params
  );
  return rows;
}

export async function getLiveForSchool(schoolId: string): Promise<any[]> {
  const { rows } = await db.query(
    `WITH latest AS (
       SELECT tl.*,
              ROW_NUMBER() OVER (PARTITION BY tl.trip_id ORDER BY tl.recorded_at DESC) rn
       FROM trip_locations tl
     )
     SELECT t.id AS trip_id, t.bus_id, t.driver_id, t.direction, t.start_time,
            l.lat, l.lng, l.speed_kph, l.recorded_at,
            b.name AS bus_name,
            (SELECT COUNT(*) FROM trip_targets tt WHERE tt.trip_id = t.id AND tt.status = 'pending') AS remaining_pending
     FROM trips t
     LEFT JOIN latest l ON l.trip_id = t.id AND l.rn = 1
     LEFT JOIN buses b ON b.id = t.bus_id
     WHERE t.school_id = $1 AND t.status = 'running'
     ORDER BY t.start_time DESC`,
    [schoolId]
  );
  return rows;
}

export async function getLiveForParent(userId: string): Promise<any | null> {
  // Find the child's bus via students->student_buses by parent user id
  const { rows } = await db.query(
    `WITH kids AS (
       SELECT s.id AS student_id, s.school_id
       FROM students s WHERE s.parent_user_id = $1 AND s.deleted_at IS NULL
     ), bus AS (
       SELECT sb.bus_id, sb.school_id FROM student_buses sb JOIN kids k ON k.student_id = sb.student_id LIMIT 1
     ), trip AS (
       SELECT t.id, t.school_id, t.bus_id, t.direction FROM trips t JOIN bus b ON b.bus_id = t.bus_id AND b.school_id = t.school_id WHERE t.status='running' LIMIT 1
     ), latest AS (
       SELECT tl.* FROM trip_locations tl JOIN trip tr ON tr.id = tl.trip_id ORDER BY tl.recorded_at DESC LIMIT 1
     ), school AS (
       SELECT id, name, latitude, longitude FROM schools s JOIN bus b ON b.school_id = s.id LIMIT 1
     ), parent_home AS (
       SELECT p.latitude, p.longitude FROM parents p WHERE p.user_id = $1 LIMIT 1
     )
     SELECT tr.id AS trip_id, tr.bus_id, tr.direction,
            l.lat, l.lng, l.recorded_at,
            sch.latitude AS school_lat, sch.longitude AS school_lng,
            ph.latitude AS home_lat, ph.longitude AS home_lng
     FROM trip tr, latest l, school sch, parent_home ph`,
    [userId]
  );
  return rows[0] ?? null;
}
