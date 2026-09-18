import { Router } from 'express';
import * as ctrl from '../controllers/admission.controller.js';
import { authenticate, resolveTenant, requireTenant, can } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

router.get('/summary', can('admissions.view'), ctrl.summary);
router.get('/seats/:classId', can('admissions.view'), ctrl.seats);
router.get('/', can('admissions.view'), validate({ query: ctrl.querySchema }), ctrl.list);
router.get('/:id', can('admissions.view'), ctrl.getOne);
router.post('/', can('admissions.manage'), validate({ body: ctrl.admissionSchema }), ctrl.create);
router.put('/:id', can('admissions.manage'), validate({ body: ctrl.admissionUpdateSchema }), ctrl.update);
router.delete('/:id', can('admissions.manage'), ctrl.remove);
router.post('/:id/status', can('admissions.manage'), validate({ body: ctrl.statusSchema }), ctrl.changeStatus);
router.post('/:id/notes', can('admissions.manage'), validate({ body: ctrl.noteSchema }), ctrl.addNote);
router.post('/:id/admit', can('admissions.admit'), validate({ body: ctrl.admitSchema }), ctrl.admit);

export default router;
