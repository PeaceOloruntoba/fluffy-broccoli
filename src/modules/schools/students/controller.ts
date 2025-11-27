import { Request, Response } from 'express';
import { z } from 'zod';
import { sendError, sendSuccess } from '../../shared/utils/response.js';
import { getSchoolByUserId } from '../../auth/repo.js';
import * as service from './service.js';

const createSchema = z.object({
  name: z.string().min(1),
  reg_no: z.string().optional().nullable(),
  class_id: z.string().uuid().optional().nullable(),
  parent_id: z.string().uuid().optional().nullable() // users.id of parent
});

const updateSchema = z.object({
  name: z.string().optional().nullable(),
  reg_no: z.string().optional().nullable(),
  class_id: z.string().uuid().optional().nullable(),
  parent_id: z.string().uuid().optional().nullable()
});

export async function createStudent(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const row = await service.createStudent(school.id, parsed.data);
    return sendSuccess(res, row, 'student_created', 201);
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'create_student_failed', 400, e);
  }
}

export async function getStudentById(req: Request, res: Response) {
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const { studentId } = req.params;
    const row = await service.getStudentWithParent(studentId, school.id);
    if (!row) return sendError(res, 'student_not_found_or_unauthorized', 404);
    return sendSuccess(res, row, 'student_details');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'get_student_failed', 400, e);
  }
}

export async function bulkCreateStudents(req: Request, res: Response) {
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);

    const file = (req as any).file as { buffer?: Buffer; originalname?: string } | undefined;
    if (!file?.buffer) return sendError(res, 'file_required', 400);

    const name = file.originalname?.toLowerCase() ?? '';
    const rows: Array<{ name: string; reg_no?: string | null }> = [];

    if (name.endsWith('.csv')) {
      const text = file.buffer.toString('utf8');
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      for (const line of lines) {
        const [n, reg] = line.split(',').map(s => s?.trim());
        if (!n) continue;
        rows.push({ name: n, reg_no: reg ?? null });
      }
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      try {
        const xlsx: any = await import('xlsx');
        const wb = xlsx.read(file.buffer, { type: 'buffer' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[];
        for (const row of json) {
          const n = (row?.[0] ?? '').toString().trim();
          const reg = row?.[1] != null ? row[1].toString().trim() : null;
          if (!n) continue;
          rows.push({ name: n, reg_no: reg });
        }
      } catch {
        return sendError(res, 'xlsx_not_supported_install_dependency', 400);
      }
    } else {
      return sendError(res, 'unsupported_file_type', 400);
    }

    if (rows.length === 0) return sendError(res, 'no_rows_found', 400);

    const count = await service.bulkCreateStudents(school.id, rows);
    return sendSuccess(res, { inserted: count }, 'students_bulk_created', 201);
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'bulk_create_failed', 400, e);
  }
}

export async function listStudents(req: Request, res: Response) {
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const { class_id } = req.query as any;
    const classId = typeof class_id === 'string' && class_id.length > 0 ? class_id : undefined;
    const rows = await service.listStudents(school.id, classId);
    return sendSuccess(res, rows, 'students_list');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'list_students_failed', 400, e);
  }
}

export async function editStudent(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const { studentId } = req.params;
    const ok = await service.updateStudent(studentId, school.id, parsed.data);
    if (!ok) return sendError(res, 'student_not_found_or_unauthorized', 404);
    return sendSuccess(res, null, 'student_updated');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'update_student_failed', 400, e);
  }
}

export async function deleteStudent(req: Request, res: Response) {
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const { studentId } = req.params;
    const ok = await service.removeStudent(studentId, school.id);
    if (!ok) return sendError(res, 'student_not_found_or_unauthorized', 404);
    return sendSuccess(res, null, 'student_deleted');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'delete_student_failed', 400, e);
  }
}

const assignStudentsSchema = z.object({
  student_ids: z.array(z.string().uuid()).min(1)
});

export async function assignStudentsToBus(req: Request, res: Response) {
  const parsed = assignStudentsSchema.extend({ bus_id: z.string().uuid() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const count = await service.assignStudentsToBus(school.id, parsed.data.bus_id, parsed.data.student_ids);
    return sendSuccess(res, { assigned: count }, 'students_assigned_to_bus');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'assign_students_bus_failed', 400, e);
  }
}

export async function assignStudentsToClass(req: Request, res: Response) {
  const parsed = assignStudentsSchema.extend({ class_id: z.string().uuid() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const result = await service.assignStudentsToClass(school.id, parsed.data.class_id, parsed.data.student_ids);
    return sendSuccess(res, result, 'students_assigned_to_class');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'assign_students_class_failed', 400, e);
  }
}

export async function unassignStudentsFromBus(req: Request, res: Response) {
  const parsed = assignStudentsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const count = await service.unassignStudentsFromBus(school.id, parsed.data.student_ids);
    return sendSuccess(res, { unassigned: count }, 'students_unassigned_from_bus');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'unassign_students_bus_failed', 400, e);
  }
}

export async function unassignStudentsFromClass(req: Request, res: Response) {
  const parsed = assignStudentsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  try {
    const user = (req as any).auth;
    if (!user) return sendError(res, 'unauthorized', 401);
    const school = await getSchoolByUserId(user.sub);
    if (!school) return sendError(res, 'school_not_found', 400);
    const result = await service.unassignStudentsFromClass(school.id, parsed.data.student_ids);
    return sendSuccess(res, result, 'students_unassigned_from_class');
  } catch (e) {
    return sendError(res, e instanceof Error ? e.message : 'unassign_students_class_failed', 400, e);
  }
}
