import { db } from '../../shared/config/db.js';
import { generateDriverCode } from '../../shared/utils/code.js';
import { createUserTx, reserveUniqueCodeTx, insertDriverTx, getSchoolByUserId } from '../../auth/repo.js';
import type { CreateDriverRequest, UpdateDriverRequest, Driver } from './type.js';
import * as repo from './repo.js';
import { hashPassword } from '../../shared/utils/password.js';

export async function createDriver(schoolId: string, schoolUserId: string, input: CreateDriverRequest): Promise<{ id: string; email: string; code: string } & Driver> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const hashed = await hashPassword(Math.random().toString(36).slice(2,10));
    const user = await createUserTx(client, { name: input.name, email: input.email, password: hashed, role: 'driver' });
    const school = await getSchoolByUserId(schoolUserId);
    const baseCode = school?.school_code ?? `${String(schoolId).slice(0,4)}-0000`;
    let code = '';
    for (let i = 0; i < 5; i++) {
      const c = generateDriverCode(baseCode);
      const ok = await reserveUniqueCodeTx(client, c);
      if (ok) { code = c; break; }
    }
    if (!code) throw new Error('could_not_allocate_code');
    await insertDriverTx(client, { user_id: user.id, school_id: schoolId, driver_code: code });
    await client.query('COMMIT');
    return { id: user.id, email: user.email, code, user_id: user.id, school_id: schoolId, name: input.name, phone: input.phone ?? null, created_at: '', updated_at: '', deleted_at: null } as any;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function listDrivers(schoolId: string) {
  return repo.listDriversBySchool(schoolId);
}

export async function getDriver(driverId: string, schoolId: string) {
  return repo.getDriverById(driverId, schoolId);
}

export async function updateDriver(driverId: string, schoolId: string, input: UpdateDriverRequest) {
  return repo.updateDriver(driverId, schoolId, {
    name: input.name ?? undefined,
    phone: input.phone ?? undefined
  });
}

export async function removeDriver(driverId: string, schoolId: string) {
  return repo.softDeleteDriver(driverId, schoolId);
}
