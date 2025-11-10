import type { CorsOptions } from 'cors';
import { env } from './env.js';

function parseOrigins(): string[] | '*' {
  if (env.CORS_ORIGIN === '*') return '*';
  const fromList = (env.CORS_ORIGINS ?? '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
  const single = env.CORS_ORIGIN?.trim();
  const list = [...fromList, ...(single && single !== '*' ? [single] : [])];
  return list.length ? Array.from(new Set(list)) : '*';
}

export function getCorsOptions(): CorsOptions {
  const allowed = parseOrigins();
  return {
    credentials: true,
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // mobile apps, curl, server-to-server
      if (allowed === '*') return cb(null, true);
      if ((allowed as string[]).includes(origin)) return cb(null, true);
      cb(new Error('CORS origin not allowed'));
    }
  };
}
