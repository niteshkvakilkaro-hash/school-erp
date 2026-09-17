import { Router } from 'express';
import * as ctrl from '../controllers/homework.controller.js';
import { authenticate, resolveTenant, requireTenant, can } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

router.get('/', can('homework.view'), validate({ query: ctrl.querySchema }), ctrl.list);
router.get('/:id', can('homework.view'), ctrl.getOne);

router.post('/', can('homework.manage'), validate({ body: ctrl.createSchema }), ctrl.create);
router.put('/:id', can('homework.manage'), validate({ body: ctrl.updateSchema }), ctrl.update);
router.delete('/:id', can('homework.manage'), ctrl.remove);

export default router;
