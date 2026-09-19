import { Router } from 'express';
import * as heads from '../controllers/feeHead.controller.js';
import * as fees from '../controllers/fee.controller.js';
import { authenticate, resolveTenant, requireTenant, can } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as online from '../controllers/onlinePayment.controller.js';

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

// ---- Fee heads ----
router.get('/heads', can('fees.view'), validate({ query: heads.querySchema }), heads.list);
router.post('/heads', can('fees.manage'), validate({ body: heads.createSchema }), heads.create);
router.put('/heads/:id', can('fees.manage'), validate({ body: heads.updateSchema }), heads.update);
router.delete('/heads/:id', can('fees.manage'), heads.remove);

// ---- Reports ----
router.get('/summary', can('fees.report', 'fees.view'), fees.summary);

// ---- Students & ledger ----
router.get('/students', can('fees.view'), validate({ query: fees.listQuerySchema }), fees.students);
router.get('/students/:studentId', can('fees.view'), fees.studentLedger);

// ---- Assign ----
router.post('/assign', can('fees.manage'), validate({ body: fees.assignSchema }), fees.assign);

// ---- Payments ----
router.get('/payments', can('fees.view'), validate({ query: fees.paymentQuerySchema }), fees.payments);
router.post('/payments', can('fees.collect'), validate({ body: fees.paymentSchema }), fees.collect);
router.delete('/payments/:id', can('fees.collect'), fees.removePayment);

router.post('/reminders', can('fees.manage'), validate({ body: fees.reminderSchema }), fees.sendReminders);

// ---- Online payment (Razorpay / demo) ----
router.get('/online/settings', can('fees.view'), online.getSettings);
router.put('/online/settings', can('fees.manage'), validate({ body: online.settingsSchema }), online.updateSettings);
router.get('/online/orders', can('fees.view'), validate({ query: online.ordersQuerySchema }), online.listOrders);

export default router;
