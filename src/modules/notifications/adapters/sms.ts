import type { NotificationPayload } from '../types.js';

export async function sendSmsAdapter(_p: NotificationPayload, _phone: string) {
  // TODO: Integrate Africa's Talking SDK using env AFRICASTALKING_USERNAME/AFRICASTALKING_API_KEY
  return;
}
