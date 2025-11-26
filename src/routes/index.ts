import { Router } from 'express';
import { sendSuccess } from '../modules/shared/utils/response.js';
import { db } from '../modules/shared/config/db.js';
import authRouter from '../modules/auth/route.js';
import { listSchoolsMinimal } from '../modules/auth/repo.js';
import superadminRouter from '../modules/superadmin/route.js';
import classesRouter from '../modules/schools/classes/index.js';
import parentsRouter from '../modules/schools/parents/route.js';
import studentsRouter from '../modules/schools/students/index.js';
import parentStudentsRouter from '../modules/parents/students/route.js';
import busesRouter from '../modules/schools/buses/index.js';
import driversRouter from '../modules/schools/drivers/route.js';
import teachersRouter from '../modules/schools/teachers/route.js';
import { requireAuth } from '../modules/shared/middlewares/auth.js';
import attendanceRouter from '../modules/attendance/route.js';
import trackingRouter from '../modules/tracking/route.js';
import notificationsRouter from '../modules/notifications/route.js';

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
router.use('/superadmin', requireAuth(['superadmin']), superadminRouter);
router.use('/classes', classesRouter);
router.use('/schools/parents', parentsRouter);
router.use('/schools/students', studentsRouter);
router.use('/parents/students', parentStudentsRouter);
router.use('/schools/buses', busesRouter);
router.use('/schools/drivers', driversRouter);
router.use('/schools/teachers', teachersRouter);
router.use('/attendance', attendanceRouter);
router.use('/tracking', trackingRouter);
router.use('/notifications', requireAuth(), notificationsRouter);

// Public endpoints
router.get('/public/schools', async (_req, res, next) => {
  try {
    const rows = await listSchoolsMinimal();
    return sendSuccess(res, rows.map(r => ({ id: r.id, school_code: r.school_code, name: r.name })), 'schools_list');
  } catch (e) {
    next(e);
  }
});

export default router;
