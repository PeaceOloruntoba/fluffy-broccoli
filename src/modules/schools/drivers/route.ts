import { Router } from 'express';
import { requireAuth } from '../../shared/middlewares/auth.js';
import * as ctrl from './controller.js';

const router = Router();

router.post('/', requireAuth(['admin']), ctrl.createDriver);
router.get('/', requireAuth(['admin']), ctrl.listDrivers);
router.get('/:driverId', requireAuth(['admin']), ctrl.getDriverById);
router.patch('/:driverId', requireAuth(['admin']), ctrl.editDriver);
router.delete('/:driverId', requireAuth(['admin']), ctrl.deleteDriver);

export default router;
