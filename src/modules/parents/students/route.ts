import { Router } from 'express';
import { requireAuth } from '../../shared/middlewares/auth.js';
import * as ctrl from './controller.js';

const router = Router();

// Parent routes (role: parent)
router.post('/', requireAuth(['parent']), ctrl.createStudent);
router.get('/', requireAuth(['parent']), ctrl.listMyStudents);
router.patch('/:studentId', requireAuth(['parent']), ctrl.editMyStudent);
router.delete('/:studentId', requireAuth(['parent']), ctrl.deleteMyStudent);

export default router;
