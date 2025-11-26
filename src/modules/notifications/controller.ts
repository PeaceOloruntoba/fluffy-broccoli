import { Request, Response } from 'express';
import * as service from './service.js';
import { sendError, sendSuccess } from '../shared/utils/response.js';

export async function getList(req: Request, res: Response) {
  const auth = (req as any).auth; if (!auth) return sendError(res, 'unauthorized', 401);
  const { is_read, cursor, limit } = req.query as any;
  const rows = await service.list(auth.sub, { is_read: is_read === 'true' ? true : is_read === 'false' ? false : undefined, cursor: cursor ?? null, limit: limit ? Number(limit) : undefined });
  return sendSuccess(res, rows, 'notifications_list');
}

export async function postRead(req: Request, res: Response) {
  const auth = (req as any).auth; if (!auth) return sendError(res, 'unauthorized', 401);
  await service.markRead(auth.sub, req.params.id);
  return sendSuccess(res, null, 'notification_read');
}

export async function postReadAll(req: Request, res: Response) {
  const auth = (req as any).auth; if (!auth) return sendError(res, 'unauthorized', 401);
  await service.markAllRead(auth.sub);
  return sendSuccess(res, null, 'notifications_read_all');
}

export async function getPreferences(req: Request, res: Response) {
  const auth = (req as any).auth; if (!auth) return sendError(res, 'unauthorized', 401);
  const prefs = await service.getPreferences(auth.sub);
  return sendSuccess(res, prefs, 'notification_preferences');
}

export async function putPreferences(req: Request, res: Response) {
  const auth = (req as any).auth; if (!auth) return sendError(res, 'unauthorized', 401);
  const prefs = await service.updatePreferences(auth.sub, req.body ?? {});
  return sendSuccess(res, prefs, 'notification_preferences_updated');
}

export async function registerDevice(req: Request, res: Response) {
  const auth = (req as any).auth; if (!auth) return sendError(res, 'unauthorized', 401);
  const { token, platform } = req.body ?? {};
  if (!token || !platform) return sendError(res, 'validation_error', 400);
  const row = await service.registerDevice(auth.sub, token, platform);
  return sendSuccess(res, row, 'device_registered');
}

export async function unregisterDevice(req: Request, res: Response) {
  const auth = (req as any).auth; if (!auth) return sendError(res, 'unauthorized', 401);
  const { token } = req.body ?? {};
  if (!token) return sendError(res, 'validation_error', 400);
  await service.unregisterDevice(auth.sub, token);
  return sendSuccess(res, null, 'device_unregistered');
}

export async function getReminders(req: Request, res: Response) {
  const auth = (req as any).auth; if (!auth) return sendError(res, 'unauthorized', 401);
  const rows = await service.listReminders(auth.sub);
  return sendSuccess(res, rows, 'parent_reminders');
}

export async function putReminder(req: Request, res: Response) {
  const auth = (req as any).auth; if (!auth) return sendError(res, 'unauthorized', 401);
  const { student_id, school_id, enabled, pickup_radius_km, dropoff_radius_km } = req.body ?? {};
  if (!student_id || !school_id) return sendError(res, 'validation_error', 400);
  const row = await service.upsertReminder(auth.sub, student_id, school_id, { enabled, pickup_radius_km, dropoff_radius_km });
  return sendSuccess(res, row, 'parent_reminder_updated');
}
