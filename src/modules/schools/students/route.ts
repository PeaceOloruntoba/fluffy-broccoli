import { Router } from 'express';
import { requireAuth } from '../../shared/middlewares/auth.js';
import * as ctrl from './controller.js';
import { upload } from '../../shared/middlewares/upload.js';

const router = Router();

// School admin routes
router.post('/', requireAuth(['admin']), ctrl.createStudent);
router.post('/bulk', requireAuth(['admin']), upload.single('file'), ctrl.bulkCreateStudents);
router.get('/', requireAuth(['admin']), ctrl.listStudents);
router.get('/:studentId', requireAuth(['admin']), ctrl.getStudentById);
router.patch('/:studentId', requireAuth(['admin']), ctrl.editStudent);
router.delete('/:studentId', requireAuth(['admin']), ctrl.deleteStudent);

// Relationships (bulk)
router.post('/assign/bus', requireAuth(['admin']), ctrl.assignStudentsToBus);
router.post('/assign/class', requireAuth(['admin']), ctrl.assignStudentsToClass);
router.post('/unassign/bus', requireAuth(['admin']), ctrl.unassignStudentsFromBus);
router.post('/unassign/class', requireAuth(['admin']), ctrl.unassignStudentsFromClass);

export default router;
