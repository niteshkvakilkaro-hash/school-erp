import { Router } from 'express';
import * as ctrl from '../controllers/hr.controller.js';
import { authenticate, resolveTenant, requireTenant, can } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadSingle } from '../utils/upload.js';

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

// ---- Staff app: apni attendance aur leave ----
router.get('/me', can('hr.self'), ctrl.me);
router.post('/me/check-in', can('hr.self'), uploadSingle, ctrl.checkIn);
router.post('/me/check-out', can('hr.self'), uploadSingle, ctrl.checkOut);
router.get('/me/attendance', can('hr.self'), validate({ query: ctrl.monthQuerySchema }), ctrl.myAttendance);
router.get('/me/leaves', can('hr.self'), ctrl.myLeaves);
router.post('/me/leaves', can('hr.self'), validate({ body: ctrl.leaveSchema }), ctrl.applyLeave);
router.post('/me/leaves/:id/cancel', can('hr.self'), ctrl.cancelLeave);

// ---- Admin panel ----
router.get('/live', can('hr.view'), validate({ query: ctrl.dateQuerySchema }), ctrl.live);
router.get('/register', can('hr.view'), validate({ query: ctrl.monthQuerySchema }), ctrl.register);
router.post('/attendance/manual', can('hr.manage'), validate({ body: ctrl.manualSchema }), ctrl.manualMark);
router.get('/attendance/:id/photo/:which', can('hr.view', 'hr.self'), ctrl.photo);
router.get('/leaves', can('hr.view'), validate({ query: ctrl.leaveQuerySchema }), ctrl.listLeaves);
router.post('/leaves/:id/review', can('hr.manage'), validate({ body: ctrl.reviewSchema }), ctrl.reviewLeave);
router.get('/settings', can('hr.view'), ctrl.getSettings);
router.put('/settings', can('hr.manage'), validate({ body: ctrl.settingsSchema }), ctrl.updateSettings);

export default router;
