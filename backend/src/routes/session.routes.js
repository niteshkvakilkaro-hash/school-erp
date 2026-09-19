import { Router } from 'express';
import * as ctrl from '../controllers/session.controller.js';
import { authenticate, resolveTenant, requireTenant, can } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

router.get('/promotion', can('sessions.manage'), ctrl.plan);
router.post('/promotion', can('sessions.manage'), validate({ body: ctrl.runSchema }), ctrl.runPromotion);
router.get('/runs', can('sessions.manage'), ctrl.runs);
router.post('/runs/:id/undo', can('sessions.manage'), ctrl.undo);
router.get('/students/:studentId/history', can('students.view'), ctrl.studentHistory);

export default router;
