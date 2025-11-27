import { Request, Response } from 'express';
import { z } from 'zod';
import { sendError, sendSuccess } from '../shared/utils/response.js';
import * as svc from './service.js';

const startSchema = z.object({ direction: z.enum(['pickup','dropoff']), route_name: z.string().optional() });
const locationsSchema = z.object({ points: z.array(z.object({
  lat: z.number(), lng: z.number(),
  recorded_at: z.string().datetime().optional(),
  speed_kph: z.number().optional(), heading: z.number().optional(), accuracy_m: z.number().optional()
})).min(1) });
const targetPatchSchema = z.object({ status: z.enum(['picked','dropped','skipped']) });

export async function startTrip(req: Request, res: Response) {
  const parsed = startSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  try {
    const auth = (req as any).auth;
    if (!auth) return sendError(res, 'unauthorized', 401);
    const result = await svc.startTrip({ user_id: auth.sub, role: auth.role, direction: parsed.data.direction, route_name: parsed.data.route_name });
    return sendSuccess(res, result, 'trip_started', 201);
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'start_trip_failed', 400, e);
  }
}

export async function getRunningTrip(req: Request, res: Response) {
  try {
    const auth = (req as any).auth;
    if (!auth) return sendError(res, 'unauthorized', 401);
    const row = await svc.getRunningTripForDriver({ user_id: auth.sub, role: auth.role });
    return sendSuccess(res, row, 'running_trip');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'get_running_trip_failed', 400, e);
  }
}

export async function postLocations(req: Request, res: Response) {
  const parsed = locationsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  try {
    const auth = (req as any).auth;
    if (!auth) return sendError(res, 'unauthorized', 401);
    const { tripId } = req.params;
    const result = await svc.addLocations({ user_id: auth.sub, role: auth.role, trip_id: tripId, points: parsed.data.points });
    return sendSuccess(res, result, 'locations_recorded', 201);
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'post_locations_failed', 400, e);
  }
}

export async function patchTarget(req: Request, res: Response) {
  const parsed = targetPatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  try {
    const auth = (req as any).auth;
    if (!auth) return sendError(res, 'unauthorized', 401);
    const { tripId, targetId } = req.params;
    const result = await svc.updateTargetStatus({ user_id: auth.sub, role: auth.role, trip_id: tripId, target_id: targetId, status: parsed.data.status });
    return sendSuccess(res, result, 'target_updated');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'patch_target_failed', 400, e);
  }
}

export async function endTrip(req: Request, res: Response) {
  try {
    const auth = (req as any).auth;
    if (!auth) return sendError(res, 'unauthorized', 401);
    const { tripId } = req.params;
    const result = await svc.endTrip({ user_id: auth.sub, role: auth.role, trip_id: tripId });
    return sendSuccess(res, result, 'trip_ended');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'end_trip_failed', 400, e);
  }
}

export async function live(req: Request, res: Response) {
  try {
    const auth = (req as any).auth;
    if (!auth) return sendError(res, 'unauthorized', 401);
    const result = await svc.getLiveView({ user_id: auth.sub, role: auth.role, query: req.query as any });
    return sendSuccess(res, result, 'live_tracking');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'live_failed', 400, e);
  }
}

export async function listTrips(req: Request, res: Response) {
  try {
    const auth = (req as any).auth;
    if (!auth) return sendError(res, 'unauthorized', 401);
    const { status, direction, cursor, limit } = req.query as any;
    const common = { status: typeof status === 'string' ? status : undefined, direction: typeof direction === 'string' ? direction : undefined, cursor: typeof cursor === 'string' ? cursor : null, limit: limit ? Number(limit) : undefined };
    if (auth.role === 'driver') {
      const rows = await svc.listTripsForDriver({ user_id: auth.sub, role: auth.role, ...common });
      return sendSuccess(res, rows, 'trips_list');
    }
    if (auth.role === 'admin' || auth.role === 'superadmin') {
      const rows = await svc.listTripsForSchool({ user_id: auth.sub, role: auth.role, ...common });
      return sendSuccess(res, rows, 'trips_list');
    }
    if (auth.role === 'parent') {
      const rows = await svc.listTripsForParent({ user_id: auth.sub, role: auth.role, ...common });
      return sendSuccess(res, rows, 'trips_list');
    }
    return sendError(res, 'forbidden', 403);
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'list_trips_failed', 400, e);
  }
}

export async function liveMine(req: Request, res: Response) {
  try {
    const auth = (req as any).auth;
    if (!auth) return sendError(res, 'unauthorized', 401);
    const result = await svc.getLiveMine({ user_id: auth.sub, role: auth.role });
    return sendSuccess(res, result, 'live_tracking_mine');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'live_mine_failed', 400, e);
  }
}
