import { Router } from 'express';
import * as ctrl from '../controllers/timetable.controller.js';
import { authenticate, resolveTenant, requireTenant, can } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

// ---- Periods (bell schedule) ----
router.get('/periods', can('timetable.view'), ctrl.listPeriods);
router.post('/periods', can('timetable.manage'), validate({ body: ctrl.periodSchema }), ctrl.createPeriod);
router.put('/periods/:id', can('timetable.manage'), validate({ body: ctrl.periodUpdateSchema }), ctrl.updatePeriod);
router.delete('/periods/:id', can('timetable.manage'), ctrl.removePeriod);

// ---- Views ----
router.get('/today', can('timetable.view'), ctrl.today);
router.get('/teacher', can('timetable.view'), validate({ query: ctrl.teacherQuerySchema }), ctrl.teacherSchedule);
router.get('/', can('timetable.view'), validate({ query: ctrl.gridQuerySchema }), ctrl.grid);

// ---- Slots ----
router.post('/slots', can('timetable.manage'), validate({ body: ctrl.slotSchema }), ctrl.setSlot);
router.delete('/slots/:id', can('timetable.manage'), ctrl.removeSlot);

export default router;
