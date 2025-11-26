import * as repo from './repo.js';
import * as dispatcher from './dispatcher.js';
import type { NotificationPayload } from './types.js';

export async function list(user_id: string, query: { is_read?: boolean; cursor?: string | null; limit?: number }) {
  return repo.listNotifications(user_id, query);
}

export async function markRead(user_id: string, id: string) {
  return repo.markRead(user_id, id);
}

export async function markAllRead(user_id: string) {
  return repo.markAllRead(user_id);
}

export async function getPreferences(user_id: string) {
  return repo.getPreferences(user_id);
}

export async function updatePreferences(user_id: string, prefs: any) {
  return repo.upsertPreferences(user_id, prefs);
}

export async function registerDevice(user_id: string, token: string, platform: 'ios'|'android'|'web') {
  return repo.registerDeviceToken(user_id, token, platform);
}

export async function unregisterDevice(user_id: string, token: string) {
  return repo.unregisterDeviceToken(user_id, token);
}

export async function notify(p: NotificationPayload & { email?: string | null; pushTokens?: string[] }) {
  return dispatcher.dispatch(p);
}

export async function listReminders(user_id: string) {
  return repo.listParentReminders(user_id);
}

export async function upsertReminder(user_id: string, student_id: string, school_id: string, body: { enabled?: boolean; pickup_radius_km?: number; dropoff_radius_km?: number }) {
  return repo.upsertParentReminder(user_id, student_id, school_id, body);
}

// Hook from tracking: evaluate reminders on location pings
export async function handleLocationPingForReminders(params: { trip_id: string; points: Array<{ lat: number; lng: number; recorded_at?: string | null }> }) {
  if (!params.points?.length) return;
  const reminders = await repo.getRemindersForTrip(params.trip_id);
  if (!reminders.length) return;

  const toRad = (d: number) => (d * Math.PI) / 180;
  const haversineMeters = (aLat: number, aLng: number, bLat: number, bLng: number) => {
    const R = 6371000;
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const s1 = Math.sin(dLat / 2) ** 2;
    const s2 = Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.asin(Math.sqrt(s1 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * s2));
    return R * c;
  };

  // Use closest of the batch points to reduce flapping
  for (const r of reminders) {
    if (r.home_lat == null || r.home_lng == null) continue;
    const meters = params.points.reduce((min, p) => {
      const d = haversineMeters(p.lat, p.lng, r.home_lat as number, r.home_lng as number);
      return d < min ? d : min;
    }, Number.POSITIVE_INFINITY);

    const thresholdKm = r.direction === 'pickup' ? (r.pickup_radius_km ?? 5) : (r.dropoff_radius_km ?? 10);
    const within = meters <= thresholdKm * 1000;
    if (!within) continue;

    const type = r.direction === 'pickup' ? 'reminder.pickup' : 'reminder.dropoff';
    // Cooldown window to avoid spamming: 15 minutes
    const recent = await repo.hasRecentReminder(r.parent_user_id, type as any, r.student_id, 15);
    if (recent) continue;

    const tokens = await repo.listDeviceTokensByUser(r.parent_user_id);
    const payload: NotificationPayload & { pushTokens?: string[] } = {
      user_id: r.parent_user_id,
      title: r.direction === 'pickup' ? 'Pickup reminder' : 'Dropoff reminder',
      body: r.direction === 'pickup' ? 'Your child\'s bus is approaching home' : 'The bus is nearing home for dropoff',
      type,
      category: 'trip',
      data: { student_id: r.student_id, trip_id: params.trip_id, distance_m: Math.round(meters) },
      channels: { inapp: true, push: true, email: false, sms: false },
      pushTokens: tokens
    };
    await dispatcher.dispatch(payload);
  }
}
