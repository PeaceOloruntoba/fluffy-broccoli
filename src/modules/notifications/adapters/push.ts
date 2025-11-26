import type { NotificationPayload } from '../types.js';

export async function sendPushAdapter(_p: NotificationPayload, _tokens: string[]) {
  // TODO: Integrate Firebase Admin SDK using service account envs
  return { success: true };
}
