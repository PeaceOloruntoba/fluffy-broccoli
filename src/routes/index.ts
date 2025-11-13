import { Router } from 'express';
import { sendSuccess } from '../modules/shared/utils/response.js';
import { db } from '../modules/shared/config/db.js';
import authRouter from '../modules/auth/route.js';

const router = Router();

router.get('/health', async (_req, res) => {
  const result: { uptime: number; db: 'up' | 'down' } = { uptime: process.uptime(), db: 'down' };
  try {
    await db.query('SELECT 1');
    result.db = 'up';
    return sendSuccess(res, result, 'healthy');
  } catch (e) {
    return res.status(503).json({ success: false, message: 'unhealthy', data: result });
  }
});

router.use('/auth', authRouter);

export default router;
