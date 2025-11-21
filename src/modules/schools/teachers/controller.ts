import { Request, Response } from 'express';
import { z } from 'zod';
import { sendError, sendSuccess } from '../../shared/utils/response.js';
import { getSchoolByUserId } from '../../auth/repo.js';
import * as service from './service.js';

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  nin: z.string().optional().nullable(),
  gender: z.enum(['male','female']),
  dob: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
  state_of_origin: z.string().optional().nullable(),
  phone: z.string().optional().nullable()
});

const updateSchema = z.object({
  name: z.string().optional().nullable(),
  nin: z.string().optional().nullable(),
  gender: z.enum(['male','female']).optional().nullable(),
  dob: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
  state_of_origin: z.string().optional().nullable(),
  phone: z.string().optional().nullable()
});

export async function createTeacher(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const result = await service.createTeacherAsSchool(school.id, user.sub, parsed.data);
    return sendSuccess(res, result, 'teacher_created', 201);
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'create_teacher_failed', 400);
  }
}

export async function listTeachers(req: Request, res: Response) {
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const rows = await service.listTeachers(school.id);
    return sendSuccess(res, rows, 'teachers_list');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'list_teachers_failed', 400);
  }
}

export async function getTeacherById(req: Request, res: Response) {
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const { teacherId } = req.params;
    const row = await service.getTeacher(teacherId, school.id);
    if (!row) return sendError(res, 'teacher_not_found_or_unauthorized', 404);
    return sendSuccess(res, row, 'teacher_details');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'get_teacher_failed', 400);
  }
}

export async function editTeacher(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const { teacherId } = req.params;
    const ok = await service.updateTeacher(teacherId, school.id, parsed.data);
    if (!ok) return sendError(res, 'teacher_not_found_or_unauthorized', 404);
    return sendSuccess(res, null, 'teacher_updated');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'update_teacher_failed', 400);
  }
}

export async function deleteTeacher(req: Request, res: Response) {
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const { teacherId } = req.params;
    const ok = await service.removeTeacher(teacherId, school.id);
    if (!ok) return sendError(res, 'teacher_not_found_or_unauthorized', 404);
    return sendSuccess(res, null, 'teacher_deleted');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'delete_teacher_failed', 400);
  }
}

export async function verifyTeacher(req: Request, res: Response) {
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const { teacherId } = req.params;
    const ok = await service.verifyTeacher(teacherId, school.id);
    if (!ok) return sendError(res, 'teacher_not_found_or_unauthorized', 404);
    return sendSuccess(res, null, 'teacher_verified');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'verify_teacher_failed', 400);
  }
}
