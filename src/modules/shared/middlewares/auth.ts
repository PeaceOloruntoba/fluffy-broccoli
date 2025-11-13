import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';

export type AuthUser = { sub: string; role: string };

declare global {
  namespace Express {
    interface Request {
      auth?: AuthUser;
    }
  }
}

export function requireAuth(roles?: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.headers.authorization || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
      if (!token) return res.status(401).json({ success: false, message: 'unauthorized' });
      const payload = await verifyAccessToken(token);
      req.auth = { sub: String((payload as any).sub), role: String((payload as any).role) };
      if (roles && roles.length && !roles.includes(req.auth.role)) {
        return res.status(403).json({ success: false, message: 'forbidden' });
      }
      next();
    } catch (e) {
      return res.status(401).json({ success: false, message: 'unauthorized' });
    }
  };
}
