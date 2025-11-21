import { Router } from 'express';
import { requireAuth } from '../../shared/middlewares/auth.js';
import * as ctrl from './controller.js';

const router = Router();

router.post('/', requireAuth(['admin']), ctrl.createBus);
router.get('/', requireAuth(['admin']), ctrl.listBuses);
router.get('/:busId', requireAuth(['admin']), ctrl.getBusById);
router.patch('/:busId', requireAuth(['admin']), ctrl.editBus);
router.delete('/:busId', requireAuth(['admin']), ctrl.deleteBus);

export default router;
