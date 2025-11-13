import { db } from '../shared/config/db.js';

export type SchoolRow = { id: string; user_id: string; name: string; school_code: string | null; phone: string | null; state: string | null; city: string | null; country: string | null; address: string | null; latitude: number | null; longitude: number | null; logo_url: string | null; verified: boolean; deleted_at: string | null };

export async function getAllSchools(): Promise<SchoolRow[]> {
  const { rows } = await db.query(`SELECT * FROM schools WHERE deleted_at IS NULL ORDER BY created_at DESC`);
  return rows;
}

export async function getAllVerifiedSchools(): Promise<SchoolRow[]> {
  const { rows } = await db.query(`SELECT * FROM schools WHERE deleted_at IS NULL AND verified = true ORDER BY created_at DESC`);
  return rows;
}

export async function getAllUnverifiedSchools(): Promise<SchoolRow[]> {
  const { rows } = await db.query(`SELECT * FROM schools WHERE deleted_at IS NULL AND verified = false ORDER BY created_at DESC`);
  return rows;
}

export async function setSchoolVerified(id: string, verified: boolean): Promise<void> {
  await db.query(`UPDATE schools SET verified = $2, updated_at = now() WHERE id = $1`, [id, verified]);
}

export async function softDeleteSchool(id: string): Promise<void> {
  await db.query(`UPDATE schools SET deleted_at = now(), updated_at = now() WHERE id = $1`, [id]);
}

export async function updateSchool(id: string, patch: Partial<Omit<SchoolRow, 'id' | 'user_id' | 'deleted_at'>>): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(patch)) {
    fields.push(`${k} = $${i++}`);
    values.push(v);
  }
  if (!fields.length) return;
  values.push(id);
  await db.query(`UPDATE schools SET ${fields.join(', ')}, updated_at = now() WHERE id = $${i}`, values);
}
