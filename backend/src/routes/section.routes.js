import { Router } from 'express';
import * as ctrl from '../controllers/section.controller.js';
import { authenticate, resolveTenant, requireTenant, can } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

router.get('/', can('sections.view'), validate({ query: ctrl.sectionQuerySchema }), ctrl.list);
router.post('/', can('sections.manage'), validate({ body: ctrl.sectionCreateSchema }), ctrl.create);
router.put('/:id', can('sections.manage'), validate({ body: ctrl.sectionUpdateSchema }), ctrl.update);
router.delete('/:id', can('sections.manage'), ctrl.remove);

export default router;
