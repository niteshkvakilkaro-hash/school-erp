import crypto from 'node:crypto';
import { Op } from 'sequelize';
import { sequelize, PaymentSetting, PaymentOrder, Student, FeeHead, StudentFee } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { decrypt, safeEqual } from '../utils/secrets.js';
import { recordPayment, money, receiptMessage } from '../controllers/fee.controller.js';

// Test me mock server par bhejne ke liye override
const RZP_API = () => process.env.RAZORPAY_API_BASE || 'https://api.razorpay.com/v1';
export const ORDER_TTL_MIN = 30;

export async function settingsFor(schoolId) {
    const [s] = await PaymentSetting.findOrCreate({ where: { schoolId }, defaults: { schoolId } });
    return s;
}

/** Online payment chalu hai? razorpay ke liye keys bhi chahiye. */
export function isEnabled(s) {
    if (s.provider === 'demo') return true;
    return s.provider === 'razorpay' && Boolean(s.keyId && s.keySecretEnc);
}

const hmac = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('hex');

async function razorpayCreateOrder(s, order) {
    const secret = decrypt(s.keySecretEnc);
    if (!secret) throw ApiError.badRequest('Razorpay key secret set nahi hai');
    let res;
    try {
        res = await fetch(RZP_API() + '/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Basic ' + Buffer.from(s.keyId + ':' + secret).toString('base64'),
            },
            body: JSON.stringify({
                amount: Math.round(Number(order.amount) * 100),
                currency: 'INR',
                receipt: order.ref,
                notes: { schoolId: String(order.schoolId), ref: order.ref },
            }),
            signal: AbortSignal.timeout(15000),
        });
    } catch {
        throw new ApiError(502, 'Razorpay se connect nahi ho paaya - thodi der baad try kijiye');
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.id) {
        throw new ApiError(502, 'Razorpay ne order nahi banaya: ' + (body.error?.description || res.status));
    }
    return body.id;
}

/** Checkout handler se aaya signature - order_id|payment_id ka HMAC. */
export function verifyCheckoutSignature(s, orderId, paymentId, signature) {
    const secret = decrypt(s.keySecretEnc);
    if (!secret || !orderId || !paymentId || !signature) return false;
    return safeEqual(hmac(secret, orderId + '|' + paymentId), signature);
}

/** Webhook - poore raw body ka HMAC, webhook secret se. */
export function verifyWebhookSignature(s, rawBody, signature) {
    const secret = decrypt(s.webhookSecretEnc);
    if (!secret || !rawBody || !signature) return false;
    return safeEqual(hmac(secret, rawBody), signature);
}

async function nextRef(schoolId, t) {
    const prefix = 'PAY' + new Date().getFullYear() + '-';
    const last = await PaymentOrder.findOne({
        where: { schoolId, ref: { [Op.like]: prefix + '%' } },
        order: [['ref', 'DESC']],
        attributes: ['ref'],
        transaction: t,
    });
    const seq = last ? Number.parseInt(last.ref.slice(prefix.length), 10) || 0 : 0;
    return prefix + String(seq + 1).padStart(4, '0');
}

/**
 * Order banata hai - amount hamesha server fee lines ke pending se nikalta hai,
 * app jo bhi bheje. Razorpay ho to wahan bhi order banta hai.
 */
export async function createOrder({ schoolId, studentId, studentFeeIds, userId }) {
    const s = await settingsFor(schoolId);
    if (!isEnabled(s)) throw ApiError.badRequest('School ne abhi online payment chalu nahi kiya');

    const fees = await StudentFee.findAll({
        where: { schoolId, studentId, id: studentFeeIds },
        include: [{ model: FeeHead, as: 'feeHead', attributes: ['name'] }],
    });
    if (fees.length !== new Set(studentFeeIds).size) throw ApiError.badRequest('Kuch fee lines is student ki nahi hain');

    const lines = [];
    for (const f of fees) {
        if (f.status === 'waived') continue;
        const pending = money(Number(f.amount) - Number(f.discount) - Number(f.paidAmount));
        if (pending > 0) lines.push({ studentFeeId: f.id, feeHead: f.feeHead?.name || 'Fee', amount: pending });
    }
    if (!lines.length) throw ApiError.badRequest('Chuni hui fees me kuch baaki nahi hai');
    const amount = money(lines.reduce((a, l) => a + l.amount, 0));
    if (amount < 1) throw ApiError.badRequest('Kam se kam Rs 1 ka payment');

    const order = await sequelize.transaction(async (t) => {
        await Student.findByPk(studentId, { lock: t.LOCK.UPDATE, transaction: t, attributes: ['id'] });
        return PaymentOrder.create(
            {
                schoolId,
                studentId,
                createdById: userId || null,
                ref: await nextRef(schoolId, t),
                token: crypto.randomBytes(24).toString('hex'),
                gateway: s.provider,
                amount,
                linesJson: JSON.stringify(lines),
            },
            { transaction: t }
        );
    });

    if (s.provider === 'razorpay') {
        try {
            order.gatewayOrderId = await razorpayCreateOrder(s, order);
            await order.save();
        } catch (err) {
            await order.update({ status: 'failed', failureReason: err.message.slice(0, 250) });
            throw err;
        }
    }
    return order;
}

/**
 * Paisa aa gaya - har line ki receipt. Order row lock + status check se
 * verify aur webhook dono aa jayein tab bhi receipt ek hi baar banti hai.
 * Beech me counter par bhar diya ho to jitna bacha utna hi lagta hai, baaki `excess`.
 */
export async function fulfillOrder(orderId, opts = {}) {
    const result = await fulfillTx(orderId, opts);
    if (!result.already && result.order.receiptNos) {
        const o = result.order;
        receiptMessage(o.schoolId, o.studentId, money(Number(o.amount) - Number(o.excess)), o.receiptNos.split(',').join(', '));
    }
    return result;
}

function fulfillTx(orderId, { paymentId, method } = {}) {
    return sequelize.transaction(async (t) => {
        const order = await PaymentOrder.findByPk(orderId, { lock: t.LOCK.UPDATE, transaction: t });
        if (!order) throw ApiError.notFound('Order nahi mila');
        if (order.status === 'paid') return { order, already: true };

        const receipts = [];
        let excess = 0;
        for (const line of order.lines) {
            const { payment, applied } = await recordPayment(
                {
                    schoolId: order.schoolId,
                    studentFeeId: line.studentFeeId,
                    amount: line.amount,
                    mode: 'online',
                    reference: paymentId || order.ref,
                    remarks: 'Online ' + order.ref + (order.gateway === 'demo' ? ' (DEMO)' : ''),
                    maxOnly: true,
                },
                t
            );
            if (payment) receipts.push(payment.receiptNo);
            excess += money(line.amount - applied);
        }
        await order.update(
            {
                status: 'paid',
                gatewayPaymentId: paymentId || null,
                method: method || null,
                paidAt: new Date(),
                receiptNos: receipts.join(','),
                excess: money(excess),
                failureReason: null,
            },
            { transaction: t }
        );
        return { order, already: false };
    });
}

/** Purana 'created' order - 30 min baad naya banana padega (payment page par). */
export const isStale = (o) => o.status === 'created' && Date.now() - new Date(o.createdAt).getTime() > ORDER_TTL_MIN * 60000;

export function shapeOrder(o) {
    return {
        ref: o.ref,
        status: isStale(o) ? 'expired' : o.status,
        gateway: o.gateway,
        amount: money(o.amount),
        lines: o.lines,
        receiptNos: o.receiptNos ? o.receiptNos.split(',') : [],
        excess: money(o.excess),
        paidAt: o.paidAt,
        failureReason: o.failureReason,
        createdAt: o.createdAt,
    };
}
