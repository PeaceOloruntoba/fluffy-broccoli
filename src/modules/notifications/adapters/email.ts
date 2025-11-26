import { sendEmail } from '../../shared/services/email.js';
import type { NotificationPayload } from '../types.js';

export async function sendEmailAdapter(p: NotificationPayload, to: string) {
  await sendEmail({ to, subject: p.title, html: `<p>${p.body}</p>` });
}
