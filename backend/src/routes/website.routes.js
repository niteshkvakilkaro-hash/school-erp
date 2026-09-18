import { Router } from 'express';
import * as ctrl from '../controllers/website.controller.js';
import { authenticate, resolveTenant, requireTenant, can } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

router.get('/', can('website.manage'), ctrl.get);
router.put('/', can('website.manage'), validate({ body: ctrl.siteSchema }), ctrl.update);

export default router;
