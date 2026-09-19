import { Router } from 'express';
import * as ctrl from '../controllers/audit.controller.js';
import { authenticate, resolveTenant, can } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
// requireTenant nahi - Super Admin bina school ke platform ka log dekhta hai
router.use(authenticate, resolveTenant, can('audit.view'));

router.get('/', validate({ query: ctrl.querySchema }), ctrl.list);
router.get('/filters', ctrl.filters);
router.get('/export', validate({ query: ctrl.querySchema }), ctrl.exportCsv);

export default router;
