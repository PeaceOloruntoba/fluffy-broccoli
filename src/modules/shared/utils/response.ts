import { Response } from 'express';

export function sendSuccess(res: Response, data: unknown, message = 'success', status = 200) {
  return res.status(status).json({ success: true, message, data });
}

export function sendError(res: Response, message = 'error', status = 400, details?: unknown) {
  return res.status(status).json({ success: false, message, details });
}
