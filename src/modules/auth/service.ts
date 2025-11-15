import { addMinutes } from 'date-fns';
import { env } from '../shared/config/env.js';
import { generateSixDigitOtp } from '../shared/utils/otp.js';
import { hashPassword, verifyPassword } from '../shared/utils/password.js';
import { signAccessToken } from '../shared/utils/jwt.js';
import { sendEmail } from '../shared/services/email.js';
import type { LoginRequest, LoginResponse } from './type.js';
import { consumeOtp, createUserTx, deleteOtpsForEmailPurpose, findUserByEmailOrUsername, findValidOtp, getSchoolById, getSchoolByUserId, getParentByUserId, getTeacherByUserId, getUserByEmail, insertOtp, insertParentTx, insertSchoolTx, insertTeacherTx, isProfileVerified, reserveUniqueCodeTx, setUserEmailVerifiedByEmail, updateLastLogin, updateUserPassword } from './repo.js';
import { db } from '../shared/config/db.js';
import type { SignupParentRequest, SignupSchoolRequest, SignupTeacherRequest } from './type.js';
import { uploadBuffer } from '../shared/services/cloudinary.js';
import { generatePersonCode, generateSchoolCode } from '../shared/utils/code.js';

export async function login(input: LoginRequest): Promise<LoginResponse> {
  const user = await findUserByEmailOrUsername(input.identifier);
  if (!user) throw new Error('invalid_credentials');
  const ok = await verifyPassword(input.password, user.password);
  if (!ok) throw new Error('invalid_credentials');
  // Enforce verification
  if (!user.email_verified && user.role !== 'superadmin' && user.role !== 'dev') {
    throw new Error('email_not_verified');
  }
  if (['admin', 'parent', 'teacher', 'driver'].includes(user.role)) {
    const verified = await isProfileVerified(user.id, user.role as any);
    if (!verified) throw new Error('account_not_verified');
  }
  await updateLastLogin(user.id);
  const token = await signAccessToken({ sub: user.id, role: user.role });
  const { password, ...safeUser } = user as any;

  // Fetch profile based on role
  let profile: any = null;
  if (user.role === 'admin') {
    profile = await getSchoolByUserId(user.id);
  } else if (user.role === 'parent') {
    profile = await getParentByUserId(user.id);
  } else if (user.role === 'teacher') {
    profile = await getTeacherByUserId(user.id);
  }

  return { token, user: safeUser, ...(profile && { profile }) };
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
  await setUserEmailVerifiedByEmail(email);
}

export async function resendEmailVerification(email: string): Promise<void> {
  const user = await getUserByEmail(email);
  if (!user) return; // do not leak
  await deleteOtpsForEmailPurpose(email, 'email_verify');
  const code = generateSixDigitOtp();
  const expires = addMinutes(new Date(), env.OTP_TTL_MINUTES);
  await insertOtp(email, code, 'email_verify', expires);
  await sendEmail({ to: email, subject: 'Verify your email', html: `<p>Your verification code is <b>${code}</b></p>` });
}

export async function signupSchool(input: SignupSchoolRequest) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const hashed = await hashPassword(input.password);
    const user = await createUserTx(client, { name: input.name, email: input.email, password: hashed, role: 'admin' });
    // generate unique school code
    let schoolCode = '';
    for (let i = 0; i < 5; i++) {
      const code = generateSchoolCode(input.name);
      const ok = await reserveUniqueCodeTx(client, code);
      if (ok) { schoolCode = code; break; }
    }
    if (!schoolCode) throw new Error('could_not_allocate_code');
    let logoUrl: string | undefined;
    if (input.logoFile) {
      logoUrl = await uploadBuffer(input.logoFile, 'myschoolbus/schools');
    }
    await insertSchoolTx(client, {
      user_id: user.id,
      name: input.name,
      school_code: schoolCode,
      phone: input.phone,
      state: input.state ?? null,
      city: input.city ?? null,
      country: input.country ?? null,
      address: input.address ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      logo_url: logoUrl ?? null
    });
    // email verification OTP (inside transaction; rollback on failure)
    const code = generateSixDigitOtp();
    const expires = addMinutes(new Date(), env.OTP_TTL_MINUTES);
    await insertOtp(input.email, code, 'email_verify', expires);
    await sendEmail({ to: input.email, subject: 'Verify your email', html: `<p>Your verification code is <b>${code}</b></p>` });
    await client.query('COMMIT');
    return { id: user.id, email: user.email };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function signupParent(input: SignupParentRequest) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const hashed = await hashPassword(input.password);
    const user = await createUserTx(client, { name: input.fullname, email: input.email, password: hashed, role: 'parent' });
    const school = await getSchoolById(input.school_id);
    if (!school || !school.school_code) throw new Error('invalid_school');
    // generate unique parent code
    let parentCode = '';
    for (let i = 0; i < 5; i++) {
      const code = generatePersonCode('PA', school.school_code, input.fullname);
      const ok = await reserveUniqueCodeTx(client, code);
      if (ok) { parentCode = code; break; }
    }
    if (!parentCode) throw new Error('could_not_allocate_code');
    await insertParentTx(client, {
      user_id: user.id,
      school_id: input.school_id,
      parent_code: parentCode,
      fullname: input.fullname,
      phone_number: input.phonenumber,
      nin: input.nin ?? null,
      relationship: input.relationship,
      address: input.address ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null
    });
    const code = generateSixDigitOtp();
    const expires = addMinutes(new Date(), env.OTP_TTL_MINUTES);
    await insertOtp(input.email, code, 'email_verify', expires);
    await sendEmail({ to: input.email, subject: 'Verify your email', html: `<p>Your verification code is <b>${code}</b></p>` });
    await client.query('COMMIT');
    return { id: user.id, email: user.email };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function signupTeacher(input: SignupTeacherRequest) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const hashed = await hashPassword(input.password);
    const user = await createUserTx(client, { name: input.name, email: input.email, password: hashed, role: 'teacher' });
    const school = await getSchoolById(input.school_id);
    if (!school || !school.school_code) throw new Error('invalid_school');
    let passportUrl: string | undefined;
    if (input.passportFile) {
      passportUrl = await uploadBuffer(input.passportFile, 'myschoolbus/teachers');
    }
    // generate unique teacher code
    let teacherCode = '';
    for (let i = 0; i < 5; i++) {
      const code = generatePersonCode('TE', school.school_code, input.name);
      const ok = await reserveUniqueCodeTx(client, code);
      if (ok) { teacherCode = code; break; }
    }
    if (!teacherCode) throw new Error('could_not_allocate_code');
    await insertTeacherTx(client, {
      user_id: user.id,
      school_id: input.school_id,
      teacher_code: teacherCode,
      name: input.name,
      nin: input.nin ?? null,
      gender: input.gender,
      dob: input.dob ?? null,
      nationality: input.nationality ?? null,
      state_of_origin: input.state_of_origin ?? null,
      phone: input.phone ?? null,
      passport_photo_url: passportUrl ?? null
    });
    const code = generateSixDigitOtp();
    const expires = addMinutes(new Date(), env.OTP_TTL_MINUTES);
    await insertOtp(input.email, code, 'email_verify', expires);
    await sendEmail({ to: input.email, subject: 'Verify your email', html: `<p>Your verification code is <b>${code}</b></p>` });
    await client.query('COMMIT');
    return { id: user.id, email: user.email };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
export {};
