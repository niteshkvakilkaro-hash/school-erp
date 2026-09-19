import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as ctrl from '../controllers/public.controller.js';
import * as pay from '../controllers/onlinePayment.controller.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// Public form - ek IP se 15 minute me 5 enquiry tak, spam na bhare
const enquiryLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Bahut saari requests - thodi der baad try kijiye' },
});

router.get('/sites/:slug', ctrl.site);
router.post('/sites/:slug/enquiry', enquiryLimiter, validate({ body: ctrl.enquirySchema }), ctrl.enquiry);

// ---- Fees ka online payment (link token se, bina login) ----
const payLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
router.get('/pay/:token', payLimiter, pay.pageData);
router.post('/pay/:token/verify', payLimiter, validate({ body: pay.verifySchema }), pay.verify);
router.post('/pay/:token/demo', payLimiter, validate({ body: pay.demoSchema }), pay.demoOutcome);
router.post('/payments/razorpay-webhook/:schoolId', pay.webhook);

export default router;
