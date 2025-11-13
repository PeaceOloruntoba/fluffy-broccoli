import { Router } from 'express';
import * as ctrl from './controller.js';

const router = Router();

router.post('/login', ctrl.login);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password', ctrl.resetPassword);
router.post('/verify-email', ctrl.verifyEmail);

export default router;
