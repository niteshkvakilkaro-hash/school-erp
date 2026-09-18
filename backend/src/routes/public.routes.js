import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as ctrl from '../controllers/public.controller.js';
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

export default router;
