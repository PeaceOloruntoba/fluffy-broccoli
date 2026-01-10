import { db } from '../../shared/config/db.js';
import { geocodeAddressToCoords } from '../../shared/utils/geocode.js';
import { hashPassword } from '../../shared/utils/password.js';
import { generatePersonCode } from '../../shared/utils/code.js';
import { reserveUniqueCodeTx, createUserTx, insertParentTx } from '../../auth/repo.js';
import * as repo from './repo.js';
import type { CreateParentRequest, UpdateParentRequest, Parent } from './type.js';

export async function createParentAsSchool(schoolId: string, schoolUserId: string, input: CreateParentRequest): Promise<{ id: string; email: string; fullname: string | null }> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const hashed = await hashPassword(input.password);
    // create user
    const user = await createUserTx(client, { name: input.fullname, email: input.email, password: hashed, role: 'parent' });

    // generate unique parent code
    let parentCode = '';
    for (let i = 0; i < 5; i++) {
      const code = generatePersonCode('PT', /* school code not available here; use school id short */ schoolId.slice(0,4), input.fullname);
      const ok = await reserveUniqueCodeTx(client, code);
      if (ok) { parentCode = code; break; }
    }
    if (!parentCode) throw new Error('could_not_allocate_code');

    // resolve coordinates if only address provided
    let lat = input.latitude ?? null;
    let lng = input.longitude ?? null;
    if ((lat == null || lng == null) && input.address) {
      const geo = await geocodeAddressToCoords(input.address);
      if (geo) { lat = geo.lat; lng = geo.lng; }
    }

    // insert parent
    await insertParentTx(client, {
      user_id: user.id,
      school_id: schoolId,
      parent_code: parentCode,
      fullname: input.fullname ?? null,
      phone_number: input.phonenumber ?? null,
      nin: input.nin ?? null,
      relationship: input.relationship ?? null,
      address: input.address ?? null,
      latitude: lat,
      longitude: lng
    });

    // mark parent verified and user email_verified within transaction
    await client.query(`UPDATE parents SET verified = true, updated_at = now() WHERE user_id = $1`, [user.id]);
    await client.query(`UPDATE users SET email_verified = true, updated_at = now() WHERE id = $1`, [user.id]);

    await client.query('COMMIT');
    return { id: user.id, email: user.email, fullname: user.name };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function listParents(schoolId: string, filter?: 'all'|'verified'|'unverified') {
  return repo.listParentsBySchool(schoolId, filter ?? 'all');
}

export async function removeParent(parentId: string, schoolId: string) {
  return repo.softDeleteParent(parentId, schoolId);
}

export async function updateParent(parentId: string, schoolId: string, input: UpdateParentRequest) {
  // If only address is present, resolve coordinates
  let lat = input.latitude ?? undefined;
  let lng = input.longitude ?? undefined;
  if ((lat == null || lng == null) && input.address) {
    const geo = await geocodeAddressToCoords(input.address);
    if (geo) { lat = geo.lat; lng = geo.lng; }
  }
  return repo.updateParent(parentId, schoolId, {
    fullname: input.fullname ?? undefined,
    phone_number: input.phonenumber ?? undefined,
    nin: input.nin ?? undefined,
    relationship: input.relationship ?? undefined,
    address: input.address ?? undefined,
    latitude: lat,
    longitude: lng
  } as any);
}

export async function verifyParent(parentId: string, schoolId: string): Promise<boolean> {
  return repo.setParentVerified(parentId, schoolId, true);
}
