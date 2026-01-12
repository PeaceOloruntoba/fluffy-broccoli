import { Request, Response } from 'express';
import { z } from 'zod';
import { sendError, sendSuccess } from '../../shared/utils/response.js';
import { getParentByUserId } from '../../auth/repo.js';
import * as studentsService from '../../schools/students/service.js';
import * as studentsRepo from '../../schools/students/repo.js';

const createSchema = z.object({
  name: z.string().min(1),
  reg_no: z.string().optional().nullable(),
  class_id: z.string().uuid().optional().nullable()
});

const updateSchema = z.object({
  name: z.string().optional().nullable(),
  reg_no: z.string().optional().nullable(),
  class_id: z.string().uuid().optional().nullable()
});

const linkSchema = z.object({
  reg_no: z.string().min(1)
});

export async function createStudent(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const parent = await getParentByUserId(user.sub);
    if (!parent) return sendError(res, 'parent_profile_not_found', 400);
    const row = await studentsService.createStudent(parent.school_id, {
      name: parsed.data.name,
      reg_no: parsed.data.reg_no ?? null,
      class_id: parsed.data.class_id ?? null,
      parent_id: user.sub
    });
    return sendSuccess(res, row, 'student_created', 201);
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'create_student_failed', 400, e);
  }
}
export async function linkExistingStudent(req: Request, res: Response) {
  const parsed = linkSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    // Look up parent's school to scope reg_no
    const parent = await getParentByUserId(user.sub);
    if (!parent) return sendError(res, 'parent_profile_not_found', 400);
    const ok = await studentsRepo.linkStudentToParentByRegNo(parsed.data.reg_no, parent.school_id, user.sub);
    if (!ok) return sendError(res, 'link_failed_or_already_linked', 400);
    const student = await studentsRepo.getStudentByRegNo(parsed.data.reg_no, parent.school_id);
    return sendSuccess(res, student, 'student_linked');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'link_student_failed', 400, e);
  }
}

export async function unlinkMyStudent(req: Request, res: Response) {
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const { studentId } = req.params;
    const ok = await studentsRepo.unlinkStudentForParent(studentId, user.sub);
    if (!ok) return sendError(res, 'student_not_found_or_unauthorized', 404);
    return sendSuccess(res, null, 'student_unlinked');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'unlink_student_failed', 400, e);
  }
}

export async function listMyStudents(req: Request, res: Response) {
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const rows = await studentsRepo.listStudentsByParent(user.sub);
    return sendSuccess(res, rows, 'students_list');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'list_students_failed', 400, e);
  }
}

export async function editMyStudent(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const { studentId } = req.params;
    const ok = await studentsRepo.updateStudentForParent(studentId, user.sub, {
      name: parsed.data.name ?? undefined,
      reg_no: parsed.data.reg_no ?? undefined,
      class_id: parsed.data.class_id ?? undefined
    });
    if (!ok) return sendError(res, 'student_not_found_or_unauthorized', 404);
    return sendSuccess(res, null, 'student_updated');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'update_student_failed', 400, e);
  }
}

export async function deleteMyStudent(req: Request, res: Response) {
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const { studentId } = req.params;
    const ok = await studentsRepo.softDeleteStudentForParent(studentId, user.sub);
    if (!ok) return sendError(res, 'student_not_found_or_unauthorized', 404);
    return sendSuccess(res, null, 'student_deleted');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'delete_student_failed', 400, e);
  }
}
