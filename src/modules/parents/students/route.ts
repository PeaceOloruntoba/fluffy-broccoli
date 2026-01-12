import { Router } from 'express';
import { requireAuth } from '../../shared/middlewares/auth.js';
import * as ctrl from './controller.js';

const router = Router();

// Parent routes (role: parent)
router.post('/', requireAuth(['parent']), ctrl.createStudent);
router.get('/', requireAuth(['parent']), ctrl.listMyStudents);
router.patch('/:studentId', requireAuth(['parent']), ctrl.editMyStudent);
router.delete('/:studentId', requireAuth(['parent']), ctrl.deleteMyStudent);
// Link existing student by reg_no to this parent; and unlink
router.post('/link', requireAuth(['parent']), ctrl.linkExistingStudent);
router.delete('/:studentId/unlink', requireAuth(['parent']), ctrl.unlinkMyStudent);

export default router;
