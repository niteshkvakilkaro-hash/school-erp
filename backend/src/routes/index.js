import { Router } from 'express';
import authRoutes from './auth.routes.js';
import platformRoutes from './platform.routes.js';
import roleRoutes from './role.routes.js';
import userRoutes from './user.routes.js';
import portalRoutes from './portal.routes.js';
import schoolRoutes from './school.routes.js';
import studentRoutes from './student.routes.js';
import teacherRoutes from './teacher.routes.js';
import classRoutes from './class.routes.js';
import sectionRoutes from './section.routes.js';
import subjectRoutes from './subject.routes.js';
import attendanceRoutes from './attendance.routes.js';
import homeworkRoutes from './homework.routes.js';
import examRoutes from './exam.routes.js';
import { authenticate, resolveTenant, requireTenant, can } from '../middleware/auth.js';
import { stats } from '../controllers/dashboard.controller.js';

const router = Router();

router.get('/health', (_req, res) =>
    res.json({ success: true, message: 'ERPSC API is running', time: new Date().toISOString() })
);

router.use('/auth', authRoutes);

// Super admin ka apna area - kisi school se juda nahi
router.use('/platform', platformRoutes);

// Mobile app (parent + student)
router.use('/portal', portalRoutes);

// School-scoped modules
router.get(
    '/dashboard/stats',
    authenticate,
    resolveTenant,
    requireTenant,
    can('dashboard.view'),
    stats
);
router.use('/school', schoolRoutes);
router.use('/roles', roleRoutes);
router.use('/users', userRoutes);
router.use('/students', studentRoutes);
router.use('/teachers', teacherRoutes);
router.use('/classes', classRoutes);
router.use('/sections', sectionRoutes);
router.use('/subjects', subjectRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/homework', homeworkRoutes);
router.use('/exams', examRoutes);

export default router;
