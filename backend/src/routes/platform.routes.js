import { Router } from 'express';
import * as ctrl from '../controllers/platform.controller.js';
import * as backup from '../controllers/backup.controller.js';
import { authenticate, platformOnly, can } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate, platformOnly);

router.get('/stats', can('platform.dashboard.view'), ctrl.platformStats);

router.get('/schools', can('platform.schools.view'), validate({ query: ctrl.schoolQuerySchema }), ctrl.listSchools);
router.get('/schools/:id', can('platform.schools.view'), ctrl.getSchool);
router.post('/schools', can('platform.schools.manage'), validate({ body: ctrl.schoolCreateSchema }), ctrl.createSchool);
router.put('/schools/:id', can('platform.schools.manage'), validate({ body: ctrl.schoolUpdateSchema }), ctrl.updateSchool);
router.delete('/schools/:id', can('platform.schools.manage'), ctrl.removeSchool);

router.get('/plans', can('platform.plans.manage', 'platform.schools.view'), ctrl.listPlans);
router.post('/plans', can('platform.plans.manage'), validate({ body: ctrl.planSchema }), ctrl.createPlan);
router.put('/plans/:id', can('platform.plans.manage'), validate({ body: ctrl.planSchema.partial() }), ctrl.updatePlan);
router.delete('/plans/:id', can('platform.plans.manage'), ctrl.removePlan);

router.post(
    '/subscriptions',
    can('platform.plans.manage'),
    validate({ body: ctrl.subscriptionSchema }),
    ctrl.createSubscription
);

router.get('/backups', can('platform.backups.manage'), backup.overview);
router.post('/backups', can('platform.backups.manage'), backup.start);
router.get('/backups/:id/download', can('platform.backups.manage'), backup.download);

export default router;
