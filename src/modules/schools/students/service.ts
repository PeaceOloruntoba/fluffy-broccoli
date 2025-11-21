import * as repo from './repo.js';
import type { CreateStudentRequest, UpdateStudentRequest, Student } from './type.js';
import { db } from '../../shared/config/db.js';

export async function createStudent(schoolId: string, input: CreateStudentRequest): Promise<Student> {
  return repo.insertStudent({
    school_id: schoolId,
    name: input.name,
    reg_no: input.reg_no ?? null,
    class_id: input.class_id ?? null,
    parent_user_id: input.parent_id ?? null
  });
}

export async function unassignStudentsFromBus(schoolId: string, studentIds: string[]): Promise<number> {
  return repo.deleteStudentBusesBulk(schoolId, studentIds);
}

export async function unassignStudentsFromClass(schoolId: string, studentIds: string[]): Promise<{ unlinked: number; cleared: number }> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const unlinked = await repo.deleteStudentClassesBulk(schoolId, studentIds);
    const cleared = await repo.clearStudentsClassBulk(schoolId, studentIds);
    await client.query('COMMIT');
    return { unlinked, cleared };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function bulkCreateStudents(schoolId: string, rows: Array<{ name: string; reg_no?: string | null; class_id?: string | null; parent_id?: string | null }>): Promise<number> {
  const payload = rows.map(r => ({
    school_id: schoolId,
    name: r.name,
    reg_no: r.reg_no ?? null,
    class_id: r.class_id ?? null,
    parent_user_id: r.parent_id ?? null
  }));
  return repo.bulkInsertStudents(payload);
}

export async function listStudents(schoolId: string, classId?: string | null): Promise<Student[]> {
  return repo.listStudentsBySchool(schoolId, classId ?? undefined);
}

export async function getStudent(studentId: string, schoolId: string): Promise<Student | null> {
  return repo.getStudentById(studentId, schoolId);
}

export async function getStudentWithParent(studentId: string, schoolId: string): Promise<any | null> {
  return repo.getStudentByIdWithParent(studentId, schoolId);
}

export async function updateStudent(studentId: string, schoolId: string, input: UpdateStudentRequest): Promise<boolean> {
  return repo.updateStudent(studentId, schoolId, {
    name: input.name ?? undefined,
    reg_no: input.reg_no ?? undefined,
    class_id: input.class_id ?? undefined,
    parent_user_id: input.parent_id ?? undefined
  });
}

export async function removeStudent(studentId: string, schoolId: string): Promise<boolean> {
  return repo.softDeleteStudent(studentId, schoolId);
}

export async function assignStudentsToBus(schoolId: string, busId: string, studentIds: string[]): Promise<number> {
  return repo.upsertStudentBusesBulk(schoolId, busId, studentIds);
}

export async function assignStudentsToClass(schoolId: string, classId: string, studentIds: string[]): Promise<{ linked: number; updated: number }> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const linked = await repo.upsertStudentClassesBulk(schoolId, classId, studentIds);
    const updated = await repo.updateStudentsClassBulk(schoolId, classId, studentIds);
    await client.query('COMMIT');
    return { linked, updated };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
