import { Request, Response } from 'express';
import { z } from 'zod';
import { sendError, sendSuccess } from '../shared/utils/response.js';
import * as service from './service.js';

const verifySchema = z.object({ id: z.string().uuid(), verified: z.boolean() });
const updateSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
});

export async function getAllSchools(_req: Request, res: Response) {
  const rows = await service.getAllSchools();
  return sendSuccess(res, rows, 'schools');
}

export async function getAllVerifiedSchools(_req: Request, res: Response) {
  const rows = await service.getAllVerifiedSchools();
  return sendSuccess(res, rows, 'schools_verified');
}

export async function getAllUnverifiedSchools(_req: Request, res: Response) {
  const rows = await service.getAllUnverifiedSchools();
  return sendSuccess(res, rows, 'schools_unverified');
}

export async function verifySchool(req: Request, res: Response) {
  const parsed = verifySchema.safeParse({ ...req.body, ...req.params });
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  await service.verifySchool(parsed.data.id, parsed.data.verified);
  return sendSuccess(res, null, 'school_verification_updated');
}

export async function createSchool(req: Request, res: Response) {
  const body = req.body as any;
  if (!body?.name || !body?.email || !body?.phone || !body?.password) {
    return sendError(res, 'missing_required_fields', 400);
  }
  const out = await service.createSchool({
    name: body.name,
    email: body.email,
    phone: body.phone,
    password: body.password,
    state: body.state,
    city: body.city,
    country: body.country,
    address: body.address,
    latitude: body.latitude ? Number(body.latitude) : null,
    longitude: body.longitude ? Number(body.longitude) : null,
    logoFile: undefined,
  });
  return sendSuccess(res, out, 'school_created', 201);
}

export async function updateSchool(req: Request, res: Response) {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: 'validation_error', errors: parsed.error.flatten() });
  await service.updateSchool(req.params.id, parsed.data as any);
  return sendSuccess(res, null, 'school_updated');
}

export async function deleteSchool(req: Request, res: Response) {
  await service.softDeleteSchool(req.params.id);
  return sendSuccess(res, null, 'school_deleted');
}
