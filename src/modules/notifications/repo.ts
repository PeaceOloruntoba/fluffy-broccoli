import { db } from '../shared/config/db.js';

export async function insertInAppNotification(p: { user_id: string; title: string; body: string; type: string; category: string; data?: any }) {
  const { rows } = await db.query(
    `INSERT INTO notifications (user_id, title, body, type, category, data)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id, user_id, title, body, type, category, data, is_read, created_at`,
    [p.user_id, p.title, p.body, p.type, p.category, JSON.stringify(p.data ?? {})]
  );
  return rows[0];
}

export async function listNotifications(user_id: string, opts: { is_read?: boolean; limit?: number; cursor?: string | null }) {
  const limit = Math.min(opts.limit ?? 20, 100);
  const params: any[] = [user_id];
  let where = 'user_id = $1';
  if (opts.is_read !== undefined) { params.push(opts.is_read); where += ` AND is_read = $${params.length}`; }
  if (opts.cursor) { params.push(opts.cursor); where += ` AND created_at < (SELECT created_at FROM notifications WHERE id = $${params.length})`; }
  const { rows } = await db.query(
    `SELECT id, title, body, type, category, data, is_read, created_at
     FROM notifications WHERE ${where}
     ORDER BY created_at DESC
     LIMIT ${limit}`,
    params
  );
  return rows;
}

export async function markRead(user_id: string, id: string) {
  await db.query(`UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`, [id, user_id]);
  return { ok: true };
}

export async function markAllRead(user_id: string) {
  await db.query(`UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`, [user_id]);
  return { ok: true };
}

export async function upsertPreferences(user_id: string, prefs: { email?: boolean; sms?: boolean; push?: boolean; inapp?: boolean; per_category?: any; quiet_hours?: any }) {
  const { rows } = await db.query(
    `INSERT INTO notification_preferences (user_id, email, sms, push, inapp, per_category, quiet_hours)
     VALUES ($1, COALESCE($2, TRUE), COALESCE($3, FALSE), COALESCE($4, TRUE), COALESCE($5, TRUE), COALESCE($6, '{}'::jsonb), $7)
     ON CONFLICT (user_id)
     DO UPDATE SET email = COALESCE($2, notification_preferences.email),
                   sms = COALESCE($3, notification_preferences.sms),
                   push = COALESCE($4, notification_preferences.push),
                   inapp = COALESCE($5, notification_preferences.inapp),
                   per_category = COALESCE($6, notification_preferences.per_category),
                   quiet_hours = COALESCE($7, notification_preferences.quiet_hours),
                   updated_at = now()
     RETURNING user_id, email, sms, push, inapp, per_category, quiet_hours`,
    [user_id, prefs.email ?? null, prefs.sms ?? null, prefs.push ?? null, prefs.inapp ?? null, prefs.per_category ?? null, prefs.quiet_hours ?? null]
  );
  return rows[0];
}

export async function getPreferences(user_id: string) {
  const { rows } = await db.query(`SELECT user_id, email, sms, push, inapp, per_category, quiet_hours FROM notification_preferences WHERE user_id = $1`, [user_id]);
  if (rows[0]) return rows[0];
  return upsertPreferences(user_id, {});
}

export async function registerDeviceToken(user_id: string, token: string, platform: 'ios'|'android'|'web') {
  const { rows } = await db.query(
    `INSERT INTO device_tokens (user_id, token, platform)
     VALUES ($1,$2,$3)
     ON CONFLICT (user_id, token) DO UPDATE SET last_seen_at = now(), enabled = TRUE
     RETURNING id, user_id, token, platform, enabled, last_seen_at`,
    [user_id, token, platform]
  );
  return rows[0];
}

export async function unregisterDeviceToken(user_id: string, token: string) {
  await db.query(`UPDATE device_tokens SET enabled = FALSE WHERE user_id = $1 AND token = $2`, [user_id, token]);
  return { ok: true };
}

export async function upsertParentReminder(user_id: string, student_id: string, school_id: string, data: { enabled?: boolean; pickup_radius_km?: number; dropoff_radius_km?: number }) {
  const { rows } = await db.query(
    `INSERT INTO parent_reminders (parent_user_id, student_id, school_id, enabled, pickup_radius_km, dropoff_radius_km)
     VALUES ($1,$2,$3, COALESCE($4, TRUE), COALESCE($5, 5.00), COALESCE($6, 10.00))
     ON CONFLICT (parent_user_id, student_id)
     DO UPDATE SET enabled = COALESCE($4, parent_reminders.enabled),
                   pickup_radius_km = COALESCE($5, parent_reminders.pickup_radius_km),
                   dropoff_radius_km = COALESCE($6, parent_reminders.dropoff_radius_km),
                   updated_at = now()
     RETURNING *`,
    [user_id, student_id, school_id, data.enabled ?? null, data.pickup_radius_km ?? null, data.dropoff_radius_km ?? null]
  );
  return rows[0];
}

export async function listParentReminders(user_id: string) {
  const { rows } = await db.query(`SELECT * FROM parent_reminders WHERE parent_user_id = $1 ORDER BY created_at DESC`, [user_id]);
  return rows;
}

// For reminder evaluation from tracking
export async function getRemindersForTrip(trip_id: string) {
  const { rows } = await db.query(
    `SELECT pr.parent_user_id, pr.student_id, pr.enabled,
            pr.pickup_radius_km::float, pr.dropoff_radius_km::float,
            tt.target_lat AS home_lat, tt.target_lng AS home_lng,
            t.direction
     FROM parent_reminders pr
     JOIN trip_targets tt ON tt.student_id = pr.student_id AND tt.trip_id = $1 AND tt.target_kind = 'home'
     JOIN trips t ON t.id = tt.trip_id
     WHERE pr.enabled = TRUE`,
    [trip_id]
  );
  return rows as Array<{ parent_user_id: string; student_id: string; enabled: boolean; pickup_radius_km: number; dropoff_radius_km: number; home_lat: number | null; home_lng: number | null; direction: 'pickup'|'dropoff' }>;
}

export async function listDeviceTokensByUser(user_id: string) {
  const { rows } = await db.query(`SELECT token FROM device_tokens WHERE user_id = $1 AND enabled = TRUE`, [user_id]);
  return rows.map(r => r.token as string);
}

export async function hasRecentReminder(user_id: string, type: 'reminder.pickup'|'reminder.dropoff', student_id: string, withinMinutes: number) {
  const { rows } = await db.query(
    `SELECT 1 FROM notifications
     WHERE user_id = $1 AND type = $2
       AND created_at > now() - ($4::int || ' minutes')::interval
       AND (data->>'student_id') = $3
     LIMIT 1`,
    [user_id, type, student_id, withinMinutes]
  );
  return !!rows[0];
}
