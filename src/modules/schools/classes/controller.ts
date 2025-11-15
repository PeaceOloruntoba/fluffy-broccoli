import { Request, Response } from 'express';
import { z } from 'zod';
import { sendError, sendSuccess } from '../../shared/utils/response.js';
import { getSchoolByUserId } from '../../auth/repo.js';
import * as service from './service.js';

const createClassSchema = z.object({
  name: z.string().min(1, 'Class name is required'),
  code: z.string().min(1, 'Class code is required')
});

export async function addClass(req: Request, res: Response) {
  const parsed = createClassSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  }

  try {
    // Extract user from auth context
    const user = (req as any).auth;
    if (!user) {
      return sendError(res, 'unauthorized', 401);
    }

    // Fetch school by user_id to get school_id
    const school = await getSchoolByUserId(user.sub);
    if (!school) {
      return sendError(res, 'school_not_found', 400);
    }

    const classData = await service.createClass(school.id, user.sub, parsed.data);
    return sendSuccess(res, classData, 'class_created', 201);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'create_class_failed';
    if (message.includes('unique_class_code_per_school')) {
      return sendError(res, 'class_code_already_exists', 400);
    }
    return sendError(res, message, 400);
  }
}

export async function removeClassEndpoint(req: Request, res: Response) {
  const { classId } = req.params;
  if (!classId) {
    return sendError(res, 'class_id_required', 400);
  }

  try {
    const user = (req as any).user;
    if (!user) {
      return sendError(res, 'unauthorized', 401);
    }

    const deleted = await service.deleteClass(classId, user.sub);
    if (!deleted) {
      return sendError(res, 'class_not_found_or_unauthorized', 404);
    }

    return sendSuccess(res, null, 'class_deleted');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'delete_class_failed', 400);
  }
}

export async function listClasses(req: Request, res: Response) {
  const { schoolId } = req.params;
  if (!schoolId) {
    return sendError(res, 'school_id_required', 400);
  }

  try {
    const classes = await service.listClassesBySchool(schoolId);
    return sendSuccess(res, classes, 'classes_list');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'list_classes_failed', 400);
  }
}
