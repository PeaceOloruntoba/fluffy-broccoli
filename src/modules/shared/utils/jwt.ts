import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

type AccessPayload = { sub: string; role: string } & Record<string, unknown>;

export function signAccessToken(payload: AccessPayload): Promise<string> {
  try {
    const token = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES as unknown as jwt.SignOptions['expiresIn'],
      algorithm: 'HS256'
    });
    return Promise.resolve(token);
  } catch (err) {
    return Promise.reject(err);
  }
}

export function verifyAccessToken(token: string): Promise<AccessPayload> {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    return Promise.resolve(decoded as AccessPayload);
  } catch (err) {
    return Promise.reject(err);
  }
}
