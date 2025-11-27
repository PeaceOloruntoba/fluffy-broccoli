import { Request, Response } from 'express';
import { z } from 'zod';
import { sendError, sendSuccess } from '../shared/utils/response.js';
import { recordSchoolAttendance, recordBusAttendance, querySchoolAttendance, queryBusAttendance } from './service.js';

const entrySchema = z.object({
  student_id: z.string().uuid(),
  status: z.enum(['present','absent','late']).optional(),
  note: z.string().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable()
});

export async function postSchoolAttendance(req: Request, res: Response) {
  console.log(req.body)
  const parsed = z.object({ entries: z.array(entrySchema).min(1), school_id: z.string().uuid().optional().nullable() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  try {
    const auth = (req as any).auth;
    if (!auth) return sendError(res, 'unauthorized', 401);
    const result = await recordSchoolAttendance({ role: auth.role, user_id: auth.sub, entries: parsed.data.entries, school_id: parsed.data.school_id ?? null });
    return sendSuccess(res, result, 'school_attendance_recorded', 201);
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'record_school_attendance_failed', 400, e);
  }
}

export async function postBusAttendance(req: Request, res: Response) {
  console.log(req.body)
  const parsed = z.object({ entries: z.array(entrySchema).min(1), school_id: z.string().uuid().optional().nullable(), bus_id: z.string().uuid().optional().nullable(), trip_id: z.string().uuid().optional().nullable() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  try {
    const auth = (req as any).auth;
    if (!auth) return sendError(res, 'unauthorized', 401);
    const result = await recordBusAttendance({ role: auth.role, user_id: auth.sub, entries: parsed.data.entries, school_id: parsed.data.school_id ?? null, bus_id: parsed.data.bus_id ?? null, trip_id: parsed.data.trip_id ?? null });
    return sendSuccess(res, result, 'bus_attendance_recorded', 201);
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'record_bus_attendance_failed', 400, e);
  }
}

export async function getSchoolAttendance(req: Request, res: Response) {
  try {
    const auth = (req as any).auth;
    if (!auth) return sendError(res, 'unauthorized', 401);
    const { date, class_id, student_id, school_id } = req.query as any;
    const rows = await querySchoolAttendance({ role: auth.role, user_id: auth.sub, date: typeof date === 'string' ? date : undefined, class_id: typeof class_id === 'string' ? class_id : undefined, student_id: typeof student_id === 'string' ? student_id : undefined, school_id: typeof school_id === 'string' ? school_id : undefined });
    return sendSuccess(res, rows, 'school_attendance_list');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'list_school_attendance_failed', 400, e);
  }
}

export async function getBusAttendance(req: Request, res: Response) {
  try {
    const auth = (req as any).auth;
    if (!auth) return sendError(res, 'unauthorized', 401);
    const { date, bus_id, student_id, school_id } = req.query as any;
    const rows = await queryBusAttendance({ role: auth.role, user_id: auth.sub, date: typeof date === 'string' ? date : undefined, bus_id: typeof bus_id === 'string' ? bus_id : undefined, student_id: typeof student_id === 'string' ? student_id : undefined, school_id: typeof school_id === 'string' ? school_id : undefined });
    return sendSuccess(res, rows, 'bus_attendance_list');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'list_bus_attendance_failed', 400, e);
  }
}
