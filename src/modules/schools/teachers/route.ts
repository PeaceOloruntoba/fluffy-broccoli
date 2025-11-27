import { Router } from 'express';
import { requireAuth } from '../../shared/middlewares/auth.js';
import * as ctrl from './controller.js';

const router = Router();

router.post('/', requireAuth(['admin']), ctrl.createTeacher);
router.get('/', requireAuth(['admin']), ctrl.listTeachers);
// Teacher self endpoints (must be before parameterized routes)
router.get('/me/students', requireAuth(['teacher']), ctrl.listMyStudents);
router.get('/:teacherId', requireAuth(['admin']), ctrl.getTeacherById);
router.patch('/:teacherId', requireAuth(['admin']), ctrl.editTeacher);
router.delete('/:teacherId', requireAuth(['admin']), ctrl.deleteTeacher);
router.post('/:teacherId/verify', requireAuth(['admin']), ctrl.verifyTeacher);

// Relationships
router.post('/:teacherId/class', requireAuth(['admin']), ctrl.assignTeacherClass);
router.delete('/:teacherId/class', requireAuth(['admin']), ctrl.unassignTeacherClass);

// end self endpoints

export default router;
