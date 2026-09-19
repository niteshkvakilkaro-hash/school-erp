import { Router } from 'express';
import * as ctrl from '../controllers/student.controller.js';
import * as imp from '../controllers/studentImport.controller.js';
import { authenticate, resolveTenant, requireTenant, can } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

router.get('/next-admission-no', can('students.create'), ctrl.nextAdmissionNo);

// Excel / CSV se bulk admission
router.get('/import/template', can('students.create'), imp.template);
router.post('/import/preview', can('students.create'), imp.uploadSheet, imp.preview);
router.post('/import', can('students.create'), imp.uploadSheet, imp.importStudents);

router.get('/', can('students.view'), validate({ query: ctrl.studentQuerySchema }), ctrl.list);
router.get('/:id', can('students.view'), ctrl.getOne);

router.post('/', can('students.create'), validate({ body: ctrl.studentCreateSchema }), ctrl.create);
router.put('/:id', can('students.update'), validate({ body: ctrl.studentUpdateSchema }), ctrl.update);
router.delete('/:id', can('students.delete'), ctrl.remove);

export default router;
