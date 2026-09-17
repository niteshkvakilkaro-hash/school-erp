import { Router } from 'express';
import * as ctrl from '../controllers/role.controller.js';
import { authenticate, resolveTenant, requireTenant, can } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

router.get('/permissions', can('roles.view', 'roles.manage'), ctrl.catalog);
router.get('/options', ctrl.options);
router.get('/', can('roles.view', 'roles.manage'), ctrl.list);
router.get('/:id', can('roles.view', 'roles.manage'), ctrl.getOne);

router.post('/', can('roles.manage'), validate({ body: ctrl.roleCreateSchema }), ctrl.create);
router.put('/:id', can('roles.manage'), validate({ body: ctrl.roleUpdateSchema }), ctrl.update);
router.delete('/:id', can('roles.manage'), ctrl.remove);

export default router;
