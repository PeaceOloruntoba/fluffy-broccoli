import { Request, Response } from 'express';
import { z } from 'zod';
import { sendError, sendSuccess } from '../../shared/utils/response.js';
import { getParentByUserId, getSchoolByUserId } from '../../auth/repo.js';
import * as parentsService from '../../schools/parents/service.js';

const patchSchema = z.object({
  fullname: z.string().optional().nullable(),
  phonenumber: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
});

export async function getMe(req: Request, res: Response) {
  try {
    const auth = (req as any).auth;
    if (!auth) return sendError(res, 'unauthorized', 401);
    const parent = await getParentByUserId(auth.sub);
    if (!parent) return sendError(res, 'parent_profile_not_found', 404);
    const school = await getSchoolByUserId(auth.sub).catch(() => null);
    return sendSuccess(res, { ...parent, school: school ? { id: school.id, name: school.name } : null }, 'parent_me');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'get_me_failed', 400, e);
  }
}

export async function patchMe(req: Request, res: Response) {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  try {
    const auth = (req as any).auth;
    if (!auth) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(auth.sub);
    const parent = await getParentByUserId(auth.sub);
    if (!school || !parent) return sendError(res, 'parent_profile_not_found', 404);
    const ok = await parentsService.updateParent(parent.id, school.id, {
      fullname: parsed.data.fullname ?? undefined,
      phonenumber: parsed.data.phonenumber ?? undefined,
      address: parsed.data.address ?? undefined,
      latitude: parsed.data.latitude ?? undefined,
      longitude: parsed.data.longitude ?? undefined,
    } as any);
    if (!ok) return sendError(res, 'update_failed', 400);
    return sendSuccess(res, null, 'parent_updated');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'patch_me_failed', 400, e);
  }
}
