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
export async function handleLocationPingForReminders(_params: { trip_id: string; points: Array<{ lat: number; lng: number; recorded_at?: string | null }> }) {
  // TODO: join trip_targets -> students -> parents -> parent_reminders, compute distance to home, fire notify when within configured radius
  return;
}
