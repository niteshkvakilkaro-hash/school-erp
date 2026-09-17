import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as ctrl from '../controllers/auth.controller.js';
import { authenticate, resolveTenant } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const loginLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Bahut zyada login attempts - 10 minute baad try kijiye' },
});

router.get('/schools', ctrl.publicSchools);
router.post('/login', loginLimiter, validate({ body: ctrl.loginSchema }), ctrl.login);
router.get('/me', authenticate, resolveTenant, ctrl.me);
router.post(
    '/change-password',
    authenticate,
    validate({ body: ctrl.changePasswordSchema }),
    ctrl.changePassword
);

export default router;
