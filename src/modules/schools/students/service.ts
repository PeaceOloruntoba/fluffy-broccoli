import * as repo from './repo.js';
import type { CreateStudentRequest, UpdateStudentRequest, Student } from './type.js';

export async function createStudent(schoolId: string, input: CreateStudentRequest): Promise<Student> {
  return repo.insertStudent({
    school_id: schoolId,
    name: input.name,
    reg_no: input.reg_no ?? null,
    class_id: input.class_id ?? null,
    parent_user_id: input.parent_id ?? null
  });
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
