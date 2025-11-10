import { Router } from 'express';
import { sendSuccess } from '../modules/shared/utils/response.js';
import { db } from '../modules/shared/config/db.js';

const router = Router();

router.get('/health', async (_req, res, next) => {
  try {
    await db.query('SELECT 1');
    sendSuccess(res, { status: 'ok' }, 'healthy');
  } catch (e) {
    next(e);
  }
});

export default router;
