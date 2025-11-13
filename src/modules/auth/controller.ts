import { Request, Response } from 'express';
import { z } from 'zod';
import { sendError, sendSuccess } from '../shared/utils/response.js';
import * as service from './service.js';

const loginSchema = z.object({ identifier: z.string().min(1), password: z.string().min(6) });
const forgotSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({ email: z.string().email(), code: z.string().length(6), newPassword: z.string().min(6) });
const verifyEmailSchema = z.object({ email: z.string().email(), code: z.string().length(6) });

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  try {
    const result = await service.login(parsed.data);
    return sendSuccess(res, result, 'login_success');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'login_failed', 401);
  }
}

export async function forgotPassword(req: Request, res: Response) {
  const parsed = forgotSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  await service.sendForgotPassword(parsed.data.email);
  return sendSuccess(res, null, 'otp_sent');
}

export async function resetPassword(req: Request, res: Response) {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  try {
    await service.resetPassword(parsed.data.email, parsed.data.code, parsed.data.newPassword);
    return sendSuccess(res, null, 'password_reset_success');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'password_reset_failed', 400);
  }
}

export async function verifyEmail(req: Request, res: Response) {
  const parsed = verifyEmailSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  try {
    await service.verifyEmail(parsed.data.email, parsed.data.code);
    return sendSuccess(res, null, 'email_verified');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'verification_failed', 400);
  }
}
export {};
