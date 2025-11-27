import { Request, Response } from 'express';
import { z } from 'zod';
import { sendError, sendSuccess } from '../../shared/utils/response.js';
import { getSchoolByUserId } from '../../auth/repo.js';
import * as service from './service.js';

const createSchema = z.object({
  name: z.string().optional().nullable(),
  plate_number: z.string().optional().nullable()
});

const updateSchema = z.object({
  name: z.string().optional().nullable(),
  plate_number: z.string().optional().nullable()
});

export async function createBus(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const bus = await service.createBus(school.id, user.sub, parsed.data);
    return sendSuccess(res, bus, 'bus_created', 201);
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'create_bus_failed', 400, e);
  }
}

export async function listBuses(req: Request, res: Response) {
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const rows = await service.listBuses(school.id);
    return sendSuccess(res, rows, 'buses_list');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'list_buses_failed', 400, e);
  }
}

export async function getBusById(req: Request, res: Response) {
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const { busId } = req.params;
    const row = await service.getBus(busId, school.id);
    if (!row) return sendError(res, 'bus_not_found_or_unauthorized', 404);
    return sendSuccess(res, row, 'bus_details');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'get_bus_failed', 400, e);
  }
}

export async function editBus(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const { busId } = req.params;
    const ok = await service.updateBus(busId, school.id, parsed.data);
    if (!ok) return sendError(res, 'bus_not_found_or_unauthorized', 404);
    return sendSuccess(res, null, 'bus_updated');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'update_bus_failed', 400, e);
  }
}

export async function deleteBus(req: Request, res: Response) {
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const { busId } = req.params;
    const ok = await service.removeBus(busId, school.id);
    if (!ok) return sendError(res, 'bus_not_found_or_unauthorized', 404);
    return sendSuccess(res, null, 'bus_deleted');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'delete_bus_failed', 400, e);
  }
}
