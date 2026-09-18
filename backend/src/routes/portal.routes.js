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
router.get('/students/:studentId/attendance', ctrl.studentAttendance);
router.get('/students/:studentId/homework', ctrl.studentHomework);
router.get('/students/:studentId/exams', ctrl.studentExams);
router.get('/students/:studentId/fees', ctrl.studentFees);
router.get('/students/:studentId/timetable', ctrl.studentTimetable);
router.get('/students/:studentId/notices', ctrl.studentNotices);
router.get('/students/:studentId/library', ctrl.studentLibrary);
router.get('/students/:studentId/exams/:examId/result', ctrl.studentResultCard);

export default router;
