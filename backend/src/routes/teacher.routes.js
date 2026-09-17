import { Router } from 'express';
import * as ctrl from '../controllers/teacher.controller.js';
import { authenticate, resolveTenant, requireTenant, can } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

router.get('/options', can('teachers.view', 'classes.manage', 'sections.manage', 'subjects.manage'), ctrl.options);
router.get('/', can('teachers.view'), validate({ query: ctrl.teacherQuerySchema }), ctrl.list);
router.get('/:id', can('teachers.view'), ctrl.getOne);

router.post('/', can('teachers.create'), validate({ body: ctrl.teacherCreateSchema }), ctrl.create);
router.put('/:id', can('teachers.update'), validate({ body: ctrl.teacherUpdateSchema }), ctrl.update);
router.delete('/:id', can('teachers.delete'), ctrl.remove);

export default router;
