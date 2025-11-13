import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

type AccessPayload = { sub: string; role: string } & Record<string, unknown>;

export function signAccessToken(payload: AccessPayload): Promise<string> {
  return new Promise((resolve, reject) => {
    jwt.sign(
      payload,
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES, algorithm: 'HS256' },
      (err: Error | null, token: string | undefined) => (err || !token ? reject(err) : resolve(token))
    );
  });
}

export function verifyAccessToken(token: string): Promise<AccessPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, env.JWT_ACCESS_SECRET, (err: jwt.VerifyErrors | null, decoded: jwt.JwtPayload | string | undefined) =>
      err ? reject(err) : resolve(decoded as AccessPayload)
    );
  });
}
