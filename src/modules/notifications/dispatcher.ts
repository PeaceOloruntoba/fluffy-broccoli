import type { NotificationPayload } from './types.js';
import { sendInApp } from './adapters/inapp.js';
import { sendEmailAdapter } from './adapters/email.js';
import { sendPushAdapter } from './adapters/push.js';
import { getPreferences } from './repo.js';

// Minimal dispatcher: currently only guarantees in-app; email/push require recipient contact data supplied by caller.
export async function dispatch(p: NotificationPayload & { email?: string | null; pushTokens?: string[] }) {
  const prefs = await getPreferences(p.user_id);
  const channels = {
    inapp: p.channels?.inapp ?? prefs.inapp,
    email: p.channels?.email ?? false,
    push: p.channels?.push ?? prefs.push,
    sms: p.channels?.sms ?? false
  };

  if (channels.inapp) await sendInApp(p);
  if (channels.email && p.email) await sendEmailAdapter(p, p.email);
  if (channels.push && p.pushTokens && p.pushTokens.length) await sendPushAdapter(p, p.pushTokens);
}
