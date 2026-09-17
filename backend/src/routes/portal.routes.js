import { Router } from 'express';
import * as ctrl from '../controllers/portal.controller.js';
import { authenticate, resolveTenant, requireTenant, can } from '../middleware/auth.js';

const router = Router();

// Student apna, parent apne bachche ka - dono me se koi bhi permission chalegi
router.use(authenticate, resolveTenant, requireTenant, can('portal.self.view', 'portal.child.view'));

router.get('/me/students', ctrl.myStudents);
router.get('/school', ctrl.schoolInfo);
router.get('/students/:studentId', ctrl.studentProfile);
router.get('/students/:studentId/subjects', ctrl.studentSubjects);
router.get('/students/:studentId/teachers', ctrl.studentTeachers);

export default router;
