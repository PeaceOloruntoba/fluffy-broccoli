import { Router } from 'express';
import { requireAuth } from '../../shared/middlewares/auth.js';
import * as ctrl from './controller.js';

const router = Router();

router.post('/', requireAuth(['admin']), ctrl.createTeacher);
router.get('/', requireAuth(['admin']), ctrl.listTeachers);
router.get('/:teacherId', requireAuth(['admin']), ctrl.getTeacherById);
router.patch('/:teacherId', requireAuth(['admin']), ctrl.editTeacher);
router.delete('/:teacherId', requireAuth(['admin']), ctrl.deleteTeacher);
router.post('/:teacherId/verify', requireAuth(['admin']), ctrl.verifyTeacher);

export default router;
