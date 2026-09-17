import { Router } from 'express';
import * as ctrl from '../controllers/class.controller.js';
import { authenticate, resolveTenant, requireTenant, can } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

router.get('/options', ctrl.options);
router.get('/', can('classes.view'), validate({ query: ctrl.listQuerySchema }), ctrl.list);
router.get('/:id', can('classes.view'), ctrl.getOne);

router.post('/', can('classes.manage'), validate({ body: ctrl.classCreateSchema }), ctrl.create);
router.put('/:id', can('classes.manage'), validate({ body: ctrl.classUpdateSchema }), ctrl.update);
router.delete('/:id', can('classes.manage'), ctrl.remove);

export default router;
