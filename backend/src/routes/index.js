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
import feeRoutes from './fee.routes.js';
import timetableRoutes from './timetable.routes.js';
import noticeRoutes from './notice.routes.js';
import libraryRoutes from './library.routes.js';
import transportRoutes from './transport.routes.js';
import admissionRoutes from './admission.routes.js';
import publicRoutes from './public.routes.js';
import websiteRoutes from './website.routes.js';
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
router.use('/public', publicRoutes);

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
router.use('/admissions', admissionRoutes);
router.use('/website', websiteRoutes);
router.use('/students', studentRoutes);
router.use('/teachers', teacherRoutes);
router.use('/classes', classRoutes);
router.use('/sections', sectionRoutes);
router.use('/subjects', subjectRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/homework', homeworkRoutes);
router.use('/exams', examRoutes);
router.use('/fees', feeRoutes);
router.use('/timetable', timetableRoutes);
router.use('/notices', noticeRoutes);
router.use('/library', libraryRoutes);
router.use('/transport', transportRoutes);

export default router;
