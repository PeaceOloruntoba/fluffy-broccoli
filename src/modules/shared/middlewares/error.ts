import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { sendError } from '../utils/response.js';

export function notFoundHandler(_req: Request, res: Response) {
  sendError(res, 'route_not_found', 404);
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // Log full error to console
  if (err instanceof Error) {
    console.error('[ERROR]', err.stack || err.message, err);
  } else {
    console.error('[ERROR]', err);
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ success: false, message: 'validation_error', errors: err.flatten() });
  }
  if (err instanceof Error) {
    return res.status(500).json({ success: false, message: err.message });
  }
  return res.status(500).json({ success: false, message: 'internal_error' });
}
