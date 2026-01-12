import { Router } from 'express';
import { requireAuth } from '../../shared/middlewares/auth.js';
import * as ctrl from './controller.js';

const router = Router();

// Parent self-profile endpoints
router.get('/me', requireAuth(['parent']), ctrl.getMe);
router.patch('/me', requireAuth(['parent']), ctrl.patchMe);

export default router;
