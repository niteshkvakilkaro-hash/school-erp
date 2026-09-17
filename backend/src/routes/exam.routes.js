import { Router } from 'express';
import * as ctrl from '../controllers/exam.controller.js';
import { authenticate, resolveTenant, requireTenant, can } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

router.get('/', can('exams.view'), validate({ query: ctrl.examQuerySchema }), ctrl.list);
router.get('/:id', can('exams.view'), ctrl.getOne);
router.get('/:id/result', can('exams.view'), ctrl.classResult);
router.get('/:id/report-card/:studentId', can('exams.view'), ctrl.reportCard);

router.post('/', can('exams.manage'), validate({ body: ctrl.examCreateSchema }), ctrl.create);
router.put('/:id', can('exams.manage'), validate({ body: ctrl.examUpdateSchema }), ctrl.update);
router.delete('/:id', can('exams.manage'), ctrl.remove);
router.post('/:id/publish', can('exams.publish'), ctrl.publish);

// Datesheet
router.post('/:id/schedule', can('exams.manage'), validate({ body: ctrl.scheduleSchema }), ctrl.addSchedule);
router.delete('/schedule/:scheduleId', can('exams.manage'), ctrl.removeSchedule);

// Marks entry
router.get('/schedule/:scheduleId/marks', can('exams.marks', 'exams.view'), ctrl.marksSheet);
router.post('/schedule/:scheduleId/marks', can('exams.marks'), validate({ body: ctrl.marksSchema }), ctrl.saveMarks);

export default router;
