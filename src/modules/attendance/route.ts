import { Router } from 'express';
import { requireAuth } from '../shared/middlewares/auth.js';
import * as ctrl from './controller.js';

const router = Router();

// Write attendance
router.post('/school', requireAuth(['superadmin','admin','teacher']), ctrl.postSchoolAttendance);
router.post('/bus', requireAuth(['superadmin','admin','driver']), ctrl.postBusAttendance);

// Read attendance (all authenticated roles, scoped in queries)
router.get('/school', requireAuth(), ctrl.getSchoolAttendance);
router.get('/bus', requireAuth(), ctrl.getBusAttendance);

export default router;
