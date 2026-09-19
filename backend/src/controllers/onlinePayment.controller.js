import { z } from 'zod';
import { Op } from 'sequelize';
import { PaymentOrder, School, Student } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginated } from '../utils/pagination.js';
import { scopedWhere } from '../utils/tenant.js';
import { encrypt } from '../utils/secrets.js';
import {
    settingsFor, isEnabled, createOrder, fulfillOrder, verifyCheckoutSignature, verifyWebhookSignature, isStale, shapeOrder,
} from '../services/payments.js';

/** Payment page ka poora link - tunnel / proxy ke peeche bhi sahi (trust proxy on hai). */
const payUrl = (req, token) => req.protocol + '://' + req.get('host') + '/pay/' + token;

/* ---------------- App (parent / student) ---------------- */

export const payOptions = (assertAccess) =>
    asyncHandler(async (req, res) => {
        const student = await assertAccess(req, req.params.studentId);
        const s = await settingsFor(req.schoolId);
        const recent = await PaymentOrder.findAll({
            where: { schoolId: req.schoolId, studentId: student.id },
            order: [['id', 'DESC']],
            limit: 5,
        });
        res.json({ success: true, data: { enabled: isEnabled(s), provider: s.provider, recent: recent.map(shapeOrder) } });
    });

export const checkoutSchema = z.object({
    studentFeeIds: z.array(z.coerce.number().int().positive()).min(1, 'Kam se kam ek fee chuniye').max(30),
});

export const checkout = (assertAccess) =>
    asyncHandler(async (req, res) => {
        const student = await assertAccess(req, req.params.studentId);
        const order = await createOrder({
            schoolId: req.schoolId,
            studentId: student.id,
            studentFeeIds: req.body.studentFeeIds,
            userId: req.user.id,
        });
        res.status(201).json({ success: true, data: { ...shapeOrder(order), payUrl: payUrl(req, order.token) } });
    });

export const orderStatus = (assertAccess) =>
    asyncHandler(async (req, res) => {
        const student = await assertAccess(req, req.params.studentId);
        const order = await PaymentOrder.findOne({ where: { schoolId: req.schoolId, studentId: student.id, ref: req.params.ref } });
        if (!order) throw ApiError.notFound('Payment nahi mila');
        res.json({ success: true, data: shapeOrder(order) });
    });

/* ---------------- Public payment page (link token se) ---------------- */

async function orderByToken(token) {
    if (!/^[a-f0-9]{48}$/.test(token || '')) throw ApiError.notFound('Payment link galat hai');
    const order = await PaymentOrder.findOne({ where: { token } });
    if (!order) throw ApiError.notFound('Payment link galat hai');
    return order;
}

export const pageData = asyncHandler(async (req, res) => {
    const order = await orderByToken(req.params.token);
    const [school, student, s] = await Promise.all([
        School.findByPk(order.schoolId, { attributes: ['name', 'logo'] }),
        Student.findByPk(order.studentId, { attributes: ['firstName', 'admissionNo'] }),
        settingsFor(order.schoolId),
    ]);
    res.json({
        success: true,
        data: {
            ...shapeOrder(order),
            school: { name: school?.name, logo: school?.logo },
            // Bahar ke link par poora naam nahi - bas pehchan ke liye
            student: { firstName: student?.firstName, admissionNo: student?.admissionNo },
            razorpay: order.gateway === 'razorpay' ? { keyId: s.keyId, orderId: order.gatewayOrderId } : null,
        },
    });
});

export const verifySchema = z.object({
    razorpay_payment_id: z.string().min(5).max(60),
    razorpay_order_id: z.string().min(5).max(60),
    razorpay_signature: z.string().min(10).max(200),
});

export const verify = asyncHandler(async (req, res) => {
    const order = await orderByToken(req.params.token);
    if (order.gateway !== 'razorpay') throw ApiError.badRequest('Ye demo payment hai');
    const s = await settingsFor(order.schoolId);
    const { razorpay_payment_id: pid, razorpay_order_id: oid, razorpay_signature: sig } = req.body;
    // Order id bhi hamara hi hona chahiye - kisi aur order ka signature yahan nahi chalega
    if (oid !== order.gatewayOrderId || !verifyCheckoutSignature(s, oid, pid, sig)) {
        throw ApiError.badRequest('Payment verify nahi hua - agar paisa kata hai to school office se sampark kijiye');
    }
    const { order: done } = await fulfillOrder(order.id, { paymentId: pid });
    res.json({ success: true, message: 'Payment ho gaya', data: shapeOrder(done) });
});

export const demoSchema = z.object({ outcome: z.enum(['success', 'fail']) });

/** Demo gateway - asli paisa nahi, sirf flow test karne ke liye. */
export const demoOutcome = asyncHandler(async (req, res) => {
    const order = await orderByToken(req.params.token);
    if (order.gateway !== 'demo') throw ApiError.badRequest('Ye asli payment hai');
    if (order.status === 'paid') return res.json({ success: true, data: shapeOrder(order) });
    if (isStale(order)) throw ApiError.badRequest('Link purana ho gaya - app se dobara Pay dabaiye');
    if (req.body.outcome === 'fail') {
        await order.update({ status: 'failed', failureReason: 'Demo: payment fail chuna' });
        return res.json({ success: true, message: 'Payment fail (demo)', data: shapeOrder(order) });
    }
    const { order: done } = await fulfillOrder(order.id, { paymentId: 'demo_' + order.ref, method: 'demo' });
    res.json({ success: true, message: 'Payment ho gaya (demo)', data: shapeOrder(done) });
});

/**
 * Razorpay webhook - browser band ho jaye tab bhi paisa record ho. Raw body par
 * school ke webhook secret se signature check. Hamesha 200 (Razorpay retry na kare)
 * sivaay signature galat ho.
 */
export const webhook = asyncHandler(async (req, res) => {
    const schoolId = Number(req.params.schoolId);
    const s = schoolId ? await settingsFor(schoolId) : null;
    if (!s || !verifyWebhookSignature(s, req.rawBody, req.get('x-razorpay-signature'))) {
        throw ApiError.badRequest('Invalid signature');
    }
    const event = req.body?.event;
    const pay = req.body?.payload?.payment?.entity;
    const orderId = pay?.order_id || req.body?.payload?.order?.entity?.id;
    if (!orderId) return res.json({ success: true, ignored: true });

    const order = await PaymentOrder.findOne({ where: { schoolId, gatewayOrderId: orderId } });
    if (!order) return res.json({ success: true, ignored: true });

    if (event === 'payment.captured' || event === 'order.paid') {
        await fulfillOrder(order.id, { paymentId: pay?.id, method: pay?.method });
    } else if (event === 'payment.failed' && order.status === 'created') {
        await order.update({ status: 'failed', failureReason: (pay?.error_description || 'Payment failed').slice(0, 250) });
    }
    res.json({ success: true });
});

/* ---------------- Admin ---------------- */

export const getSettings = asyncHandler(async (req, res) => {
    const s = await settingsFor(req.schoolId);
    res.json({
        success: true,
        data: {
            provider: s.provider,
            keyId: s.keyId,
            keySecretSet: Boolean(s.keySecretEnc),
            webhookSecretSet: Boolean(s.webhookSecretEnc),
            enabled: isEnabled(s),
            webhookUrl: req.protocol + '://' + req.get('host') + '/api/public/payments/razorpay-webhook/' + req.schoolId,
        },
    });
});

export const settingsSchema = z.object({
    provider: z.enum(['none', 'demo', 'razorpay']),
    keyId: z
        .string()
        .trim()
        .regex(/^rzp_(test|live)_[A-Za-z0-9]{6,}$/, 'Razorpay Key ID "rzp_test_..." ya "rzp_live_..." jaisi hoti hai')
        .optional()
        .or(z.literal('')),
    // Khaali = purani hi rakho
    keySecret: z.string().trim().max(100).optional(),
    webhookSecret: z.string().trim().max(100).optional(),
});

export const updateSettings = asyncHandler(async (req, res) => {
    const s = await settingsFor(req.schoolId);
    const { provider, keyId, keySecret, webhookSecret } = req.body;
    const patch = { provider };
    if (keyId !== undefined) patch.keyId = keyId || null;
    if (keySecret) patch.keySecretEnc = encrypt(keySecret);
    if (webhookSecret) patch.webhookSecretEnc = encrypt(webhookSecret);
    const next = { ...s.toJSON(), ...patch };
    if (provider === 'razorpay' && (!next.keyId || !next.keySecretEnc)) {
        throw ApiError.badRequest('Razorpay ke liye Key ID aur Key Secret dono chahiye', [{ field: 'keyId', message: 'Key ID daaliye' }]);
    }
    await s.update(patch);
    res.json({ success: true, message: provider === 'none' ? 'Online payment band' : 'Online payment settings save ho gayi' });
});

export const ordersQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    status: z.enum(['created', 'paid', 'failed', 'expired']).optional(),
});

export const listOrders = asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const where = scopedWhere(req);
    if (req.query.status) where.status = req.query.status;
    const { rows, count } = await PaymentOrder.findAndCountAll({
        where,
        include: [{ model: Student, as: 'student', attributes: ['id', 'firstName', 'lastName', 'admissionNo'] }],
        order: [['id', 'DESC']],
        limit,
        offset,
    });
    const paidToday = await PaymentOrder.sum('amount', {
        where: scopedWhere(req, { status: 'paid', paidAt: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) } }),
    });
    res.json({
        success: true,
        data: {
            ...paginated({
                rows: rows.map((o) => ({ ...shapeOrder(o), student: o.student, gatewayPaymentId: o.gatewayPaymentId })),
                count,
                page,
                limit,
            }),
            paidToday: Number(paidToday || 0),
        },
    });
});
