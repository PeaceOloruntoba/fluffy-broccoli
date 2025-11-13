export type UserRole = 'superadmin' | 'admin' | 'parent' | 'teacher' | 'driver' | 'dev';

export type User = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  role: UserRole;
  last_login: string | null;
  created_at: string;
  updated_at: string;
};

export type LoginRequest = { identifier: string; password: string };
export type LoginResponse = { token: string; user: Omit<User, 'password'> };

export type ForgotPasswordRequest = { email: string };
export type ResetPasswordRequest = { email: string; code: string; newPassword: string };
export type VerifyEmailRequest = { email: string; code: string };
