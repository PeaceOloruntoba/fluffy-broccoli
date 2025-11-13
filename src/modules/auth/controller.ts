import { Request, Response } from 'express';
import { z } from 'zod';
import { sendError, sendSuccess } from '../shared/utils/response.js';
import * as service from './service.js';

const loginSchema = z.object({ identifier: z.string().min(1), password: z.string().min(6) });
const forgotSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({ email: z.string().email(), code: z.string().length(6), newPassword: z.string().min(6) });
const verifyEmailSchema = z.object({ email: z.string().email(), code: z.string().length(6) });

const signupSchoolSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(3),
  state: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
  password: z.string().min(6)
});

const signupParentSchema = z.object({
  fullname: z.string().min(1),
  phonenumber: z.string().min(3),
  nin: z.string().optional().nullable(),
  relationship: z.enum(['Father', 'Mother', 'Aunty', 'Uncle']),
  school_id: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(6),
  address: z.string().optional().nullable(),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable()
});

const signupTeacherSchema = z.object({
  name: z.string().min(1),
  nin: z.string().optional().nullable(),
  gender: z.enum(['male', 'female']),
  dob: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
  state_of_origin: z.string().optional().nullable(),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  school_id: z.string().uuid(),
  password: z.string().min(6)
});

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

export async function signupSchool(req: Request, res: Response) {
  const body = { ...req.body };
  const parsed = signupSchoolSchema.safeParse(body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  const file = (req as any).file as Express.Multer.File | undefined;
  try {
    const result = await service.signupSchool({ ...parsed.data, logoFile: file?.buffer ?? null });
    return sendSuccess(res, result, 'signup_school_success', 201);
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'signup_failed', 400);
  }
}

export async function signupParent(req: Request, res: Response) {
  const parsed = signupParentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  try {
    const result = await service.signupParent(parsed.data);
    return sendSuccess(res, result, 'signup_parent_success', 201);
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'signup_failed', 400);
  }
}

export async function signupTeacher(req: Request, res: Response) {
  const body = { ...req.body };
  const parsed = signupTeacherSchema.safeParse(body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  const file = (req as any).file as Express.Multer.File | undefined;
  try {
    const result = await service.signupTeacher({ ...parsed.data, passportFile: file?.buffer ?? null });
    return sendSuccess(res, result, 'signup_teacher_success', 201);
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'signup_failed', 400);
  }
}
export {};
