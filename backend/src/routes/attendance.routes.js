import { Router } from 'express';
import * as ctrl from '../controllers/attendance.controller.js';
import { authenticate, resolveTenant, requireTenant, can } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

router.get('/roster', can('attendance.view', 'attendance.mark'), validate({ query: ctrl.rosterQuerySchema }), ctrl.roster);
router.get('/report', can('attendance.report', 'attendance.view'), validate({ query: ctrl.reportQuerySchema }), ctrl.report);
router.get('/student/:studentId', can('attendance.view'), validate({ query: ctrl.studentQuerySchema }), ctrl.byStudent);

router.post('/bulk', can('attendance.mark'), validate({ body: ctrl.bulkSchema }), ctrl.markBulk);

export default router;
