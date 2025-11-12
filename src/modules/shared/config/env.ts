import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  BREVO_API_KEY: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().default(15),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  CORS_ORIGIN: z.string().default('*'),
  CORS_ORIGINS: z.string().optional(),
  OTP_TTL_MINUTES: z.coerce.number().default(10)
});

export const env = schema.parse(process.env);
