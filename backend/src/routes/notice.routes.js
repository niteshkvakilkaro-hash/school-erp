import { Router } from 'express';
import * as ctrl from '../controllers/notice.controller.js';
import { authenticate, resolveTenant, requireTenant, can } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

// Feed sabko dikhta hai jiske paas notices.view hai - apni audience ke hisaab se
router.get('/feed', can('notices.view'), ctrl.feed);

router.get('/', can('notices.manage', 'notices.view'), validate({ query: ctrl.querySchema }), ctrl.list);
router.get('/:id', can('notices.manage', 'notices.view'), ctrl.getOne);

router.post('/', can('notices.manage'), validate({ body: ctrl.createSchema }), ctrl.create);
router.put('/:id', can('notices.manage'), validate({ body: ctrl.updateSchema }), ctrl.update);
router.delete('/:id', can('notices.manage'), ctrl.remove);

export default router;
