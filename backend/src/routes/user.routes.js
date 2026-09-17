import { Router } from 'express';
import * as ctrl from '../controllers/user.controller.js';
import { authenticate, resolveTenant, requireTenant, can } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

router.get('/', can('users.view', 'users.manage'), validate({ query: ctrl.userQuerySchema }), ctrl.list);
router.get('/:id', can('users.view', 'users.manage'), ctrl.getOne);

router.post('/', can('users.manage'), validate({ body: ctrl.userCreateSchema }), ctrl.create);
router.put('/:id', can('users.manage'), validate({ body: ctrl.userUpdateSchema }), ctrl.update);
router.delete('/:id', can('users.manage'), ctrl.remove);

export default router;
