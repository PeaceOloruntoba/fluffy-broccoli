import { Response } from 'express';

export function sendSuccess(res: Response, data: unknown, message = 'success', status = 200) {
  return res.status(status).json({ success: true, message, data });
}

export function sendError(res: Response, message = 'error', status = 400, details?: unknown) {
  if (details instanceof Error) {
    console.error('[SEND_ERROR]', details.stack || details.message, details);
  } else if (details !== undefined) {
    console.error('[SEND_ERROR]', details);
  }
  return res.status(status).json({ success: false, message, details });
}
