import { Request, Response } from 'express';
import { z } from 'zod';
import { sendError, sendSuccess } from '../../shared/utils/response.js';
import { getSchoolByUserId } from '../../auth/repo.js';
import * as service from './service.js';

const createSchema = z.object({
  fullname: z.string().min(1),
  phonenumber: z.string().min(3),
  nin: z.string().optional().nullable(),
  relationship: z.enum(['Father','Mother','Aunty','Uncle']),
  email: z.string().email(),
  password: z.string().min(6)
});

const updateSchema = z.object({
  fullname: z.string().optional().nullable(),
  phonenumber: z.string().optional().nullable(),
  nin: z.string().optional().nullable(),
  relationship: z.enum(['Father','Mother','Aunty','Uncle']).optional().nullable(),
  address: z.string().optional().nullable()
});

export async function createParent(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  try {
    const user = (req as any).user;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const result = await service.createParentAsSchool(school.id, user.sub, parsed.data);
    return sendSuccess(res, result, 'parent_created', 201);
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'create_parent_failed', 400);
  }
}

export async function editParent(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  try {
    const user = (req as any).user;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const { parentId } = req.params;
    const ok = await service.updateParent(parentId, school.id, parsed.data);
    if (!ok) return sendError(res, 'parent_not_found_or_unauthorized', 404);
    return sendSuccess(res, null, 'parent_updated');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'update_parent_failed', 400);
  }
}

export async function deleteParent(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const { parentId } = req.params;
    const ok = await service.removeParent(parentId, school.id);
    if (!ok) return sendError(res, 'parent_not_found_or_unauthorized', 404);
    return sendSuccess(res, null, 'parent_deleted');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'delete_parent_failed', 400);
  }
}

export async function listParents(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const { filter } = req.query as any;
    const f = filter === 'verified' ? 'verified' : filter === 'unverified' ? 'unverified' : 'all';
    const rows = await service.listParents(school.id, f as any);
    return sendSuccess(res, rows, 'parents_list');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'list_parents_failed', 400);
  }
}
