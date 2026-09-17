import { Router } from 'express';
import * as ctrl from '../controllers/student.controller.js';
import { authenticate, resolveTenant, requireTenant, can } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

router.get('/next-admission-no', can('students.create'), ctrl.nextAdmissionNo);
router.get('/', can('students.view'), validate({ query: ctrl.studentQuerySchema }), ctrl.list);
router.get('/:id', can('students.view'), ctrl.getOne);

router.post('/', can('students.create'), validate({ body: ctrl.studentCreateSchema }), ctrl.create);
router.put('/:id', can('students.update'), validate({ body: ctrl.studentUpdateSchema }), ctrl.update);
router.delete('/:id', can('students.delete'), ctrl.remove);

export default router;
