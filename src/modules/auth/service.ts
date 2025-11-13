import { addMinutes } from 'date-fns';
import { env } from '../shared/config/env.js';
import { generateSixDigitOtp } from '../shared/utils/otp.js';
import { hashPassword, verifyPassword } from '../shared/utils/password.js';
import { signAccessToken } from '../shared/utils/jwt.js';
import { sendEmail } from '../shared/services/email.js';
import type { LoginRequest, LoginResponse } from './type.js';
import { consumeOtp, findUserByEmailOrUsername, findValidOtp, getUserByEmail, insertOtp, updateLastLogin, updateUserPassword } from './repo.js';

export async function login(input: LoginRequest): Promise<LoginResponse> {
  const user = await findUserByEmailOrUsername(input.identifier);
  if (!user) throw new Error('invalid_credentials');
  const ok = await verifyPassword(input.password, user.password);
  if (!ok) throw new Error('invalid_credentials');
  await updateLastLogin(user.id);
  const token = await signAccessToken({ sub: user.id, role: user.role });
  const { password, ...safeUser } = user as any;
  return { token, user: safeUser };
}

export async function sendForgotPassword(email: string): Promise<void> {
  const user = await getUserByEmail(email);
  if (!user) return; // don't leak existence
  const code = generateSixDigitOtp();
  const expires = addMinutes(new Date(), env.OTP_TTL_MINUTES);
  await insertOtp(email, code, 'password_reset', expires);
  await sendEmail({
    to: email,
    subject: 'Password Reset Code',
    html: `<p>Your password reset code is <b>${code}</b>. It expires in ${env.OTP_TTL_MINUTES} minutes.</p>`
  });
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  const otp = await findValidOtp(email, code, 'password_reset');
  if (!otp) throw new Error('invalid_or_expired_code');
  const user = await getUserByEmail(email);
  if (!user) throw new Error('user_not_found');
  const hashed = await hashPassword(newPassword);
  await updateUserPassword(user.id, hashed);
  await consumeOtp(otp.id);
}

export async function verifyEmail(email: string, code: string): Promise<void> {
  const otp = await findValidOtp(email, code, 'email_verify');
  if (!otp) throw new Error('invalid_or_expired_code');
  await consumeOtp(otp.id);
}
export {};
