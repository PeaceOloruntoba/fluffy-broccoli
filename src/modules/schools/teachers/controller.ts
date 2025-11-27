import { Request, Response } from 'express';
import { z } from 'zod';
import { sendError, sendSuccess } from '../../shared/utils/response.js';
import { getSchoolByUserId, getTeacherByUserId } from '../../auth/repo.js';
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

const assignClassSchema = z.object({ class_id: z.string().uuid() });

export async function assignTeacherClass(req: Request, res: Response) {
  const parsed = assignClassSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const { teacherId } = req.params;
    await service.assignTeacherToClass(school.id, teacherId, parsed.data.class_id);
    return sendSuccess(res, null, 'teacher_assigned_to_class');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'assign_teacher_failed', 400);
  }
}

export async function unassignTeacherClass(req: Request, res: Response) {
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const { teacherId } = req.params;
    await service.unassignTeacherFromClass(school.id, teacherId);
    return sendSuccess(res, null, 'teacher_unassigned_from_class');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'unassign_teacher_failed', 400);
  }
}

// Teacher: list my students (students in my assigned class)
export async function listMyStudents(req: Request, res: Response) {
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const teacher = await getTeacherByUserId(user.sub);
    if (!teacher) return sendError(res, 'teacher_profile_not_found', 404);
    const details = await service.getTeacher(teacher.id, teacher.school_id);
    if (!details) return sendError(res, 'teacher_not_found_or_no_class', 404);
    return sendSuccess(res, { class: details.class, students: details.students }, 'teacher_students');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'list_teacher_students_failed', 400);
  }
}
