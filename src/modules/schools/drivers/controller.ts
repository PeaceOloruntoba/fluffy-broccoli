import { Request, Response } from 'express';
import { z } from 'zod';
import { sendError, sendSuccess } from '../../shared/utils/response.js';
import { getSchoolByUserId } from '../../auth/repo.js';
import * as service from './service.js';

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable()
});

const updateSchema = z.object({
  name: z.string().optional().nullable(),
  phone: z.string().optional().nullable()
});

export async function createDriver(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const result = await service.createDriver(school.id, user.sub, parsed.data);
    return sendSuccess(res, result, 'driver_created', 201);
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'create_driver_failed', 400, e);
  }
}

export async function listDrivers(req: Request, res: Response) {
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const rows = await service.listDrivers(school.id);
    return sendSuccess(res, rows, 'drivers_list');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'list_drivers_failed', 400, e);
  }
}

export async function getDriverById(req: Request, res: Response) {
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const { driverId } = req.params;
    const row = await service.getDriver(driverId, school.id);
    if (!row) return sendError(res, 'driver_not_found_or_unauthorized', 404);
    return sendSuccess(res, row, 'driver_details');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'get_driver_failed', 400, e);
  }
}

export async function editDriver(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const { driverId } = req.params;
    const ok = await service.updateDriver(driverId, school.id, parsed.data);
    if (!ok) return sendError(res, 'driver_not_found_or_unauthorized', 404);
    return sendSuccess(res, null, 'driver_updated');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'update_driver_failed', 400, e);
  }
}

export async function deleteDriver(req: Request, res: Response) {
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const { driverId } = req.params;
    const ok = await service.removeDriver(driverId, school.id);
    if (!ok) return sendError(res, 'driver_not_found_or_unauthorized', 404);
    return sendSuccess(res, null, 'driver_deleted');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'delete_driver_failed', 400, e);
  }
}

const assignBusSchema = z.object({ bus_id: z.string().uuid() });

export async function assignDriverBus(req: Request, res: Response) {
  const parsed = assignBusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const { driverId } = req.params;
    await service.assignDriverToBus(school.id, driverId, parsed.data.bus_id);
    return sendSuccess(res, null, 'driver_assigned_to_bus');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'assign_driver_failed', 400, e);
  }
}

export async function unassignDriverBus(req: Request, res: Response) {
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const { driverId } = req.params;
    await service.unassignDriverFromBus(school.id, driverId);
    return sendSuccess(res, null, 'driver_unassigned_from_bus');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'unassign_driver_failed', 400, e);
  }
}
