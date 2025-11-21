import * as repo from './repo.js';
import type { Bus, CreateBusRequest, UpdateBusRequest } from './type.js';
import { generateBusCode } from '../../shared/utils/code.js';
import { getSchoolByUserId } from '../../auth/repo.js';
import { reserveUniqueCodeTx } from '../../auth/repo.js';
import { db } from '../../shared/config/db.js';

export async function createBus(schoolId: string, schoolUserId: string, input: CreateBusRequest): Promise<Bus> {
  // get school code via school user id if available
  const school = await getSchoolByUserId(schoolUserId);
  const baseCode = school?.school_code ?? `${String(schoolId).slice(0,4)}-0000`;
  // reserve unique code
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    let code = '';
    for (let i = 0; i < 5; i++) {
      const c = generateBusCode(baseCode);
      const ok = await reserveUniqueCodeTx(client, c);
      if (ok) { code = c; break; }
    }
    if (!code) throw new Error('could_not_allocate_code');
    const bus = await repo.insertBus({ school_id: schoolId, name: input.name ?? null, plate_number: input.plate_number ?? null, code });
    await client.query('COMMIT');
    return bus;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function listBuses(schoolId: string): Promise<Bus[]> {
  return repo.listBusesBySchool(schoolId);
}

export async function getBus(busId: string, schoolId: string): Promise<Bus | null> {
  return repo.getBusWithDriverAndStudents(busId, schoolId) as any;
}

export async function updateBus(busId: string, schoolId: string, input: UpdateBusRequest): Promise<boolean> {
  return repo.updateBus(busId, schoolId, {
    name: input.name ?? undefined,
    plate_number: input.plate_number ?? undefined
  });
}

export async function removeBus(busId: string, schoolId: string): Promise<boolean> {
  return repo.softDeleteBus(busId, schoolId);
}
