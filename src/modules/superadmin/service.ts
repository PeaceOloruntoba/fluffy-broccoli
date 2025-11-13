import * as repo from './repo.js';
import * as authService from '../auth/service.js';
import type { SignupSchoolRequest } from '../auth/type.js';

export const getAllSchools = () => repo.getAllSchools();
export const getAllVerifiedSchools = () => repo.getAllVerifiedSchools();
export const getAllUnverifiedSchools = () => repo.getAllUnverifiedSchools();
export const verifySchool = (id: string, verified: boolean) => repo.setSchoolVerified(id, verified);
export const softDeleteSchool = (id: string) => repo.softDeleteSchool(id);
export const updateSchool = (id: string, patch: Partial<repo.SchoolRow>) => repo.updateSchool(id, patch as any);

export async function createSchool(input: SignupSchoolRequest) {
  // Reuse signup flow to create admin user + school entry with code + OTP
  const res = await authService.signupSchool(input);
  return res;
}
