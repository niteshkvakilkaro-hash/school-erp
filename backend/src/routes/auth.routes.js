import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as ctrl from '../controllers/auth.controller.js';
import * as reset from '../controllers/passwordReset.controller.js';
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

// OTP / reset par alag limit - SMS ka kharcha aur OTP guess dono rokne ke liye
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Bahut zyada koshish - 15 minute baad try kijiye' },
});

router.get('/schools', ctrl.publicSchools);
router.post('/forgot-password', otpLimiter, validate({ body: reset.requestSchema }), reset.requestOtp);
router.post('/forgot-password/verify', otpLimiter, validate({ body: reset.verifySchema }), reset.verifyOtp);
router.post('/forgot-password/reset', otpLimiter, validate({ body: reset.resetSchema }), reset.resetPassword);
router.post('/login', loginLimiter, validate({ body: ctrl.loginSchema }), ctrl.login);
router.get('/me', authenticate, resolveTenant, ctrl.me);
router.post(
    '/change-password',
    authenticate,
    validate({ body: ctrl.changePasswordSchema }),
    ctrl.changePassword
);

export default router;
