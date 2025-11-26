import { Router } from 'express';
import * as ctrl from './controller.js';
import { upload } from '../shared/middlewares/upload.js';
import { requireAuth } from '../shared/middlewares/auth.js';

const router = Router();

router.post('/login', ctrl.login);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password', ctrl.resetPassword);
router.post('/verify-email', ctrl.verifyEmail);
router.post('/resend-email-verification', ctrl.resendEmailVerification);
router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.postLogout);
router.post('/logout-all', requireAuth(), ctrl.postLogoutAll);
router.post('/refresh-cookie', ctrl.refreshCookie);
router.post('/logout-cookie', ctrl.logoutCookie);

// Signup endpoints
// School: expects name,email,phone,password and optional latitude,longitude from device/map picker
router.post('/signup/school', upload.single('logo'), ctrl.signupSchool);
router.post('/signup/parent', ctrl.signupParent);
router.post('/signup/teacher', upload.single('passport'), ctrl.signupTeacher);

export default router;
