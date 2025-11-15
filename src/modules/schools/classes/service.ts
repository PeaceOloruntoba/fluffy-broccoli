import { createClass as createClassRepo, deleteClass as deleteClassRepo, getClassesBySchoolId } from './repo.js';
import type { Class, CreateClassRequest, ClassResponse } from './type.js';

export async function createClass(schoolId: string, schoolUserId: string, input: CreateClassRequest): Promise<ClassResponse> {
  const classData = await createClassRepo({
    name: input.name,
    code: input.code,
    school_id: schoolId,
    school_user_id: schoolUserId
  });

  // Return without school_user_id
  const { school_user_id, ...response } = classData;
  return response as ClassResponse;
}

export async function deleteClass(classId: string, schoolUserId: string): Promise<boolean> {
  return deleteClassRepo(classId, schoolUserId);
}

export async function listClassesBySchool(schoolId: string): Promise<ClassResponse[]> {
  const classes = await getClassesBySchoolId(schoolId);
  // Remove school_user_id from response
  return classes.map(({ school_user_id, ...cls }) => cls as ClassResponse);
}
