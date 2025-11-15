import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  BREVO_API_KEY: z.string().optional(),
  BREVO_SENDER_EMAIL: z.string().email().optional(),
  BREVO_SENDER_NAME: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  // Booleans are passed as strings in process.env (e.g. "false"). Use preprocess
  // to convert common string values to real booleans instead of relying on
  // coercion via Boolean('false') which is truthy.
  SMTP_SECURE: z.preprocess((val) => {
    if (typeof val === 'string') return val.trim().toLowerCase() === 'true';
    return Boolean(val);
  }, z.boolean().default(false)),
  SMTP_REQUIRE_TLS: z.preprocess((val) => {
    if (typeof val === 'string') return val.trim().toLowerCase() === 'true';
    return Boolean(val);
  }, z.boolean().default(true)),
  // When false, allows connecting to servers with self-signed or otherwise
  // untrusted certificates. Keep true in production; useful for local debugging.
  SMTP_TLS_REJECT_UNAUTHORIZED: z.preprocess((val) => {
    if (typeof val === 'string') return val.trim().toLowerCase() === 'true';
    return Boolean(val);
  }, z.boolean().default(true)),
  // Enable verbose SMTP transport logs (nodemailer debug/logger). Default off.
  SMTP_DEBUG: z.preprocess((val) => {
    if (typeof val === 'string') return val.trim().toLowerCase() === 'true';
    return Boolean(val);
  }, z.boolean().default(false)),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().default(15),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  CORS_ORIGIN: z.string().default('*'),
  CORS_ORIGINS: z.string().optional(),
  OTP_TTL_MINUTES: z.coerce.number().default(10),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES: z.string().default('15m')
});

export const env = schema.parse(process.env);
