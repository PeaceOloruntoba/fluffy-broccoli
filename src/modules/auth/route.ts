import { Router } from 'express';
import * as ctrl from './controller.js';
import { upload } from '../shared/middlewares/upload.js';

const router = Router();

router.post('/login', ctrl.login);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password', ctrl.resetPassword);
router.post('/verify-email', ctrl.verifyEmail);

// Signup endpoints
router.post('/signup/school', upload.single('logo'), ctrl.signupSchool);
router.post('/signup/parent', ctrl.signupParent);
router.post('/signup/teacher', upload.single('passport'), ctrl.signupTeacher);

export default router;
