export type UserRole = 'superadmin' | 'admin' | 'parent' | 'teacher' | 'driver' | 'dev';

export type User = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  role: UserRole;
  email_verified: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
};

export type LoginRequest = { identifier: string; password: string };
export type LoginResponse = { token: string; user: Omit<User, 'password'>; profile?: any; refresh_token?: string };

export type ForgotPasswordRequest = { email: string };
export type ResetPasswordRequest = { email: string; code: string; newPassword: string };
export type VerifyEmailRequest = { email: string; code: string };

export type SignupSchoolRequest = {
  name: string;
  email: string;
  phone: string;
  state?: string | null;
  city?: string | null;
  country?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  password: string;
  logoFile?: Buffer | null;
};

export type SignupParentRequest = {
  fullname: string;
  phonenumber: string;
  nin?: string | null;
  relationship: 'Father' | 'Mother' | 'Aunty' | 'Uncle';
  school_id: string;
  email: string;
  password: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type SignupTeacherRequest = {
  name: string;
  nin?: string | null;
  gender: 'male' | 'female';
  dob?: string | null; // ISO date
  nationality?: string | null;
  state_of_origin?: string | null;
  email: string;
  phone?: string | null;
  school_id: string;
  password: string;
  passportFile?: Buffer | null;
};
