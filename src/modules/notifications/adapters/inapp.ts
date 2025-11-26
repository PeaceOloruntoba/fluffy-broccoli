import { insertInAppNotification } from '../repo.js';
import type { NotificationPayload } from '../types.js';

export async function sendInApp(p: NotificationPayload) {
  return insertInAppNotification({ user_id: p.user_id, title: p.title, body: p.body, type: p.type, category: p.category, data: p.data });
}
