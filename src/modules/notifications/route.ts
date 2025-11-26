import { Router } from 'express';
import * as ctrl from './controller.js';
import { requireAuth } from '../shared/middlewares/auth.js';

const router = Router();

router.get('/', requireAuth(), ctrl.getList);
router.post('/:id/read', requireAuth(), ctrl.postRead);
router.post('/read-all', requireAuth(), ctrl.postReadAll);

router.get('/preferences', requireAuth(), ctrl.getPreferences);
router.put('/preferences', requireAuth(), ctrl.putPreferences);

router.post('/devices/register', requireAuth(), ctrl.registerDevice);
router.post('/devices/unregister', requireAuth(), ctrl.unregisterDevice);

router.get('/reminders', requireAuth(['parent']), ctrl.getReminders);
router.put('/reminders', requireAuth(['parent']), ctrl.putReminder);

export default router;
