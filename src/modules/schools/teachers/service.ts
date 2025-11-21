import { db } from '../../shared/config/db.js';
import { generatePersonCode } from '../../shared/utils/code.js';
import { createUserTx, reserveUniqueCodeTx, insertTeacherTx, getSchoolByUserId } from '../../auth/repo.js';
import type { CreateTeacherRequest, UpdateTeacherRequest, Teacher } from './type.js';
import * as repo from './repo.js';
import { hashPassword } from '../../shared/utils/password.js';

export async function createTeacherAsSchool(schoolId: string, schoolUserId: string, input: CreateTeacherRequest): Promise<{ id: string; email: string; teacher_code: string } & Teacher> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const hashed = await hashPassword(input.password);
    const user = await createUserTx(client, { name: input.name, email: input.email, password: hashed, role: 'teacher' });
    const school = await getSchoolByUserId(schoolUserId);
    const baseCode = school?.school_code ?? `${String(schoolId).slice(0,4)}-0000`;
    let teacherCode = '';
    for (let i = 0; i < 5; i++) {
      const c = generatePersonCode('TE', baseCode, input.name);
      const ok = await reserveUniqueCodeTx(client, c);
      if (ok) { teacherCode = c; break; }
    }
    if (!teacherCode) throw new Error('could_not_allocate_code');

    await insertTeacherTx(client, {
      user_id: user.id,
      school_id: schoolId,
      teacher_code: teacherCode,
      name: input.name,
      nin: input.nin ?? null,
      gender: input.gender,
      dob: input.dob ?? null,
      nationality: input.nationality ?? null,
      state_of_origin: input.state_of_origin ?? null,
      phone: input.phone ?? null,
      passport_photo_url: null
    });

    // Mark verified (teacher profile and user email)
    await client.query(`UPDATE teachers SET verified = true, updated_at = now() WHERE user_id = $1`, [user.id]);
    await client.query(`UPDATE users SET email_verified = true, updated_at = now() WHERE id = $1`, [user.id]);

    await client.query('COMMIT');
    return { id: user.id, email: user.email, teacher_code: teacherCode, user_id: user.id, school_id: schoolId, name: input.name, nin: input.nin ?? null, gender: input.gender, dob: input.dob ?? null, nationality: input.nationality ?? null, state_of_origin: input.state_of_origin ?? null, phone: input.phone ?? null, passport_photo_url: null, verified: true, created_at: '', updated_at: '' } as any;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function listTeachers(schoolId: string) {
  return repo.listTeachersBySchool(schoolId);
}

export async function getTeacher(teacherId: string, schoolId: string) {
  return repo.getTeacherById(teacherId, schoolId);
}

export async function updateTeacher(teacherId: string, schoolId: string, input: UpdateTeacherRequest) {
  return repo.updateTeacher(teacherId, schoolId, {
    name: input.name ?? undefined,
    nin: input.nin ?? undefined,
    gender: input.gender ?? undefined,
    dob: input.dob ?? undefined,
    nationality: input.nationality ?? undefined,
    state_of_origin: input.state_of_origin ?? undefined,
    phone: input.phone ?? undefined
  });
}

export async function removeTeacher(teacherId: string, schoolId: string) {
  return repo.softDeleteTeacher(teacherId, schoolId);
}

export async function verifyTeacher(teacherId: string, schoolId: string): Promise<boolean> {
  return repo.setTeacherVerified(teacherId, schoolId, true);
}
