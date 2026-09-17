import { Router } from 'express';
import * as ctrl from '../controllers/subject.controller.js';
import { authenticate, resolveTenant, requireTenant, can } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

router.get('/', can('subjects.view'), validate({ query: ctrl.subjectQuerySchema }), ctrl.list);
router.get('/:id', can('subjects.view'), ctrl.getOne);

router.post('/', can('subjects.manage'), validate({ body: ctrl.subjectCreateSchema }), ctrl.create);
router.put('/:id', can('subjects.manage'), validate({ body: ctrl.subjectUpdateSchema }), ctrl.update);
router.delete('/:id', can('subjects.manage'), ctrl.remove);

export default router;
