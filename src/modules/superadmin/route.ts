import { Router } from 'express';
import * as ctrl from './controller.js';

const router = Router();

router.get('/schools', ctrl.getAllSchools);
router.get('/schools/verified', ctrl.getAllVerifiedSchools);
router.get('/schools/unverified', ctrl.getAllUnverifiedSchools);
router.post('/schools', ctrl.createSchool);
router.patch('/schools/:id', ctrl.updateSchool);
router.post('/schools/:id/verify', ctrl.verifySchool);
router.delete('/schools/:id', ctrl.deleteSchool);

export default router;
