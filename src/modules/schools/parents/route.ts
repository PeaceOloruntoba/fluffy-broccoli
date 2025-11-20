import { Router } from 'express';
import * as ctrl from './controller.js';
import { requireAuth } from '../../shared/middlewares/auth.js';

const router = Router();

// School admin routes
router.post('/', requireAuth(['admin']), ctrl.createParent);
router.patch('/:parentId', requireAuth(['admin']), ctrl.editParent);
router.delete('/:parentId', requireAuth(['admin']), ctrl.deleteParent);
router.get('/', requireAuth(['admin']), ctrl.listParents);
router.post('/:parentId/verify', requireAuth(['admin']), ctrl.verifyParent);

export default router;
