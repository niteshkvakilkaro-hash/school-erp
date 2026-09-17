import { Router } from 'express';
import * as ctrl from '../controllers/school.controller.js';
import { authenticate, resolveTenant, requireTenant, can } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

router.get('/', can('school.settings.view'), ctrl.getSettings);
router.put('/', can('school.settings.update'), validate({ body: ctrl.settingsSchema }), ctrl.updateSettings);

export default router;
