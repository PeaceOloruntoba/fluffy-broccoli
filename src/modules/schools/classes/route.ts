import { Router } from 'express';
import * as ctrl from './controller.js';
import { requireAuth } from '../../shared/middlewares/auth.js';

const router = Router();

// Protected routes (admin only)
router.post('/', requireAuth(['admin']), ctrl.addClass);
router.delete('/:classId', requireAuth(['admin']), ctrl.removeClassEndpoint);

// Public route
router.get('/:schoolId', ctrl.listClasses);

export default router;
