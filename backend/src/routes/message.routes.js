import { Router } from 'express';
import * as ctrl from '../controllers/message.controller.js';
import { authenticate, resolveTenant, requireTenant, can } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

router.get('/settings', can('messages.view'), ctrl.getSettings);
router.put('/settings', can('messages.manage'), validate({ body: ctrl.settingsSchema }), ctrl.updateSettings);
router.post('/test', can('messages.manage'), validate({ body: ctrl.testSchema }), ctrl.sendTest);
router.get('/logs', can('messages.view'), validate({ query: ctrl.logsQuerySchema }), ctrl.listLogs);

export default router;
