import { z } from 'zod';
import { Op, fn, col, literal } from 'sequelize';
import {
    sequelize, FeeHead, StudentFee, FeePayment, Student, SchoolClass, Section, User, School,
} from '../models/index.js';
import { PAYMENT_MODES } from '../models/FeePayment.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginated } from '../utils/pagination.js';
import { scopedWhere, findScoped, assertSameTenant } from '../utils/tenant.js';
import { notify, msgSettingsFor } from '../services/notify.js';
import { logEvent } from '../services/audit.js';

const dateStr = z.coerce.date().transform((d) => d.toISOString().slice(0, 10));
const today = () => new Date().toISOString().slice(0, 10);
export const money = (v) => Math.round(Number(v || 0) * 100) / 100;

export const assignSchema = z.object({
    feeHeadIds: z.array(z.coerce.number().int().positive()).min(1, 'Kam se kam ek fee head chuniye'),
    classId: z.coerce.number().int().positive().optional(),
    sectionId: z.coerce.number().int().positive().optional(),
    studentIds: z.array(z.coerce.number().int().positive()).optional(),
    dueDate: dateStr.optional(),
    // Pehle se lage hue heads ka amount bhi update karna hai ya nahi
    overwriteAmount: z.coerce.boolean().default(false),
});

export const paymentSchema = z.object({
    studentFeeId: z.coerce.number().int().positive({ message: 'Fee line chuniye' }),
    amount: z.coerce.number().positive('Amount 0 se zyada hona chahiye'),
    mode: z.enum(PAYMENT_MODES).default('cash'),
    reference: z.string().trim().max(60).optional(),
    paidOn: dateStr.optional(),
    remarks: z.string().trim().max(255).optional(),
});

export const listQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().trim().optional(),
    classId: z.coerce.number().int().positive().optional(),
    sectionId: z.coerce.number().int().positive().optional(),
    status: z.enum(['pending', 'partial', 'paid']).optional(),
});

export const paymentQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    studentId: z.coerce.number().int().positive().optional(),
    from: dateStr.optional(),
    to: dateStr.optional(),
    mode: z.enum(PAYMENT_MODES).optional(),
});

/** paidAmount ke hisaab se status nikaalta hai - ek hi jagah logic. */
function statusFor(fee) {
    if (fee.status === 'waived') return 'waived';
    const payable = money(Number(fee.amount) - Number(fee.discount));
    const paid = money(fee.paidAmount);
    if (paid <= 0) return 'pending';
    if (paid >= payable) return 'paid';
    return 'partial';
}

/** RCPT2026-0001 jaisa agla receipt number. Transaction me school row lock ke baad hi. */
async function nextReceiptNo(schoolId, transaction) {
    const prefix = 'RCPT' + new Date().getFullYear() + '-';
    const last = await FeePayment.findOne({
        where: { schoolId, receiptNo: { [Op.like]: prefix + '%' } },
        order: [['receiptNo', 'DESC']],
        attributes: ['receiptNo'],
        transaction,
    });
    const seq = last ? Number.parseInt(last.receiptNo.slice(prefix.length), 10) || 0 : 0;
    return prefix + String(seq + 1).padStart(4, '0');
}

/**
 * Ek fee line par payment - counter aur online dono yahi use karte hain.
 * School row (receipt number) aur fee row (pending) dono lock hote hain, taaki
 * ek saath aaye do payment fee ko zyada na bhar dein. Transaction ke andar hi chalaiye.
 * maxOnly = true: pending se zyada aaya to utna hi lagao (online), warna error (counter).
 */
export async function recordPayment({ schoolId, studentFeeId, amount, mode, reference, paidOn, collectedById, remarks, maxOnly = false }, t) {
    await School.findByPk(schoolId, { lock: t.LOCK.UPDATE, transaction: t, attributes: ['id'] });
    const fee = await StudentFee.findOne({
        where: { id: studentFeeId, schoolId },
        include: [{ model: FeeHead, as: 'feeHead', attributes: ['name'] }],
        lock: t.LOCK.UPDATE,
        transaction: t,
    });
    if (!fee) throw ApiError.notFound('Fee line nahi mili');
    if (fee.status === 'waived') {
        if (maxOnly) return { payment: null, fee, applied: 0, pending: 0 };
        throw ApiError.badRequest('Ye fee waive ki ja chuki hai');
    }
    const pending = money(Number(fee.amount) - Number(fee.discount) - Number(fee.paidAmount));
    let applied = money(amount);
    if (applied > pending) {
        if (!maxOnly) {
            throw ApiError.badRequest(
                pending <= 0 ? 'Is fee ka poora payment ho chuka hai' : 'Amount pending se zyada nahi ho sakta (pending: ' + pending + ')',
                [{ field: 'amount', message: 'Zyada se zyada ' + pending }]
            );
        }
        applied = Math.max(0, pending);
    }
    if (applied <= 0) return { payment: null, fee, applied: 0, pending };

    const payment = await FeePayment.create(
        {
            schoolId,
            studentId: fee.studentId,
            studentFeeId: fee.id,
            receiptNo: await nextReceiptNo(schoolId, t),
            amount: applied,
            mode,
            reference: reference || null,
            paidOn: paidOn || today(),
            collectedById: collectedById || null,
            remarks: remarks || null,
        },
        { transaction: t }
    );
    fee.paidAmount = money(Number(fee.paidAmount) + applied);
    fee.status = statusFor(fee);
    await fee.save({ transaction: t });
    return { payment, fee, applied, pending };
}

/**
 * Fee heads ko students par lagata hai. Class/section se ya seedha studentIds se.
 * Pehle se laga hua head dobara nahi lagta (duplicate se bachne ke liye) -
 * `overwriteAmount` true ho to sirf uska amount refresh hota hai.
 */
export const assign = asyncHandler(async (req, res) => {
    const { feeHeadIds, classId, sectionId, studentIds, dueDate, overwriteAmount } = req.body;

    if (!classId && !studentIds?.length) {
        throw ApiError.badRequest('Class ya students me se kuch to chuniye');
    }

    const heads = await FeeHead.findAll({
        where: scopedWhere(req, { id: feeHeadIds, status: 'active' }),
    });
    if (heads.length !== feeHeadIds.length) {
        throw ApiError.badRequest('Kuch fee heads aapke school ke nahi hain ya inactive hain');
    }

    const where = scopedWhere(req, { status: 'active' });
    if (studentIds?.length) {
        where.id = studentIds;
    } else {
        await assertSameTenant(SchoolClass, req, classId, 'Class');
        where.classId = classId;
        if (sectionId) {
            await assertSameTenant(Section, req, sectionId, 'Section');
            where.sectionId = sectionId;
        }
    }

    const students = await Student.findAll({ where, attributes: ['id', 'classId'] });
    if (students.length === 0) throw ApiError.badRequest('Koi active student nahi mila');

    let created = 0;
    let updated = 0;
    let skipped = 0;

    await sequelize.transaction(async (t) => {
        const existing = await StudentFee.findAll({
            where: { studentId: students.map((s) => s.id), feeHeadId: feeHeadIds },
            transaction: t,
        });
        const seen = new Set(existing.map((e) => e.studentId + ':' + e.feeHeadId));

        const fresh = [];
        for (const student of students) {
            for (const head of heads) {
                // Class-specific head doosri class ke student par nahi lagta
                if (head.classId && Number(head.classId) !== Number(student.classId)) continue;

                const key = student.id + ':' + head.id;
                if (seen.has(key)) {
                    skipped++;
                    continue;
                }
                fresh.push({
                    schoolId: req.schoolId,
                    studentId: student.id,
                    feeHeadId: head.id,
                    amount: head.amount,
                    dueDate: dueDate || null,
                });
            }
        }

        if (fresh.length) {
            await StudentFee.bulkCreate(fresh, { transaction: t });
            created = fresh.length;
        }

        if (overwriteAmount && existing.length) {
            const byHead = Object.fromEntries(heads.map((h) => [h.id, h]));
            for (const row of existing) {
                const head = byHead[row.feeHeadId];
                if (!head) continue;
                await row.update(
                    { amount: head.amount, ...(dueDate ? { dueDate } : {}) },
                    { transaction: t }
                );
                // Amount badalne se status bhi badal sakta hai
                await row.update({ status: statusFor(row) }, { transaction: t });
                updated++;
            }
            skipped -= updated;
        }
    });

    if (created || updated) {
        logEvent({ action: 'fee.assign', module: 'Fees', summary: 'Fees lagayi - ' + heads.map((h) => h.name).join(', ') + ': ' + created + ' nayi, ' + updated + ' update (' + students.length + ' students)' });
    }
    res.json({
        success: true,
        message:
            created + ' fees lagayi gayi' +
            (updated ? ', ' + updated + ' update hui' : '') +
            (skipped > 0 ? ', ' + skipped + ' pehle se thi' : ''),
        data: { created, updated, skipped, students: students.length },
    });
});

/** Students ki fee summary list - kis par kitna baaki hai. */
export const students = asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);

    const where = scopedWhere(req, { status: 'active' });
    if (req.query.classId) where.classId = req.query.classId;
    if (req.query.sectionId) where.sectionId = req.query.sectionId;
    if (req.query.search) {
        const q = '%' + req.query.search + '%';
        where[Op.or] = [
            { firstName: { [Op.like]: q } },
            { lastName: { [Op.like]: q } },
            { admissionNo: { [Op.like]: q } },
            { rollNo: { [Op.like]: q } },
        ];
    }

    const { rows, count } = await Student.findAndCountAll({
        where,
        attributes: ['id', 'admissionNo', 'firstName', 'lastName', 'rollNo'],
        include: [
            { model: SchoolClass, as: 'schoolClass', attributes: ['id', 'name'] },
            { model: Section, as: 'section', attributes: ['id', 'name'] },
        ],
        order: [['firstName', 'ASC']],
        limit,
        offset,
        subQuery: false,
    });

    // Fee totals alag query se - hasMany join karte to LIMIT joined rows par lagta
    const fees = await StudentFee.findAll({
        attributes: [
            'studentId',
            [fn('SUM', literal('amount - discount')), 'payable'],
            [fn('SUM', col('paid_amount')), 'paid'],
        ],
        where: { studentId: rows.map((r) => r.id), status: { [Op.ne]: 'waived' } },
        group: ['studentId'],
        raw: true,
    });
    const byStudent = Object.fromEntries(
        fees.map((f) => [f.studentId, { payable: money(f.payable), paid: money(f.paid) }])
    );

    let items = rows.map((s) => {
        const t = byStudent[s.id] || { payable: 0, paid: 0 };
        const pending = money(t.payable - t.paid);
        return {
            id: s.id,
            admissionNo: s.admissionNo,
            name: [s.firstName, s.lastName].filter(Boolean).join(' '),
            rollNo: s.rollNo,
            className: s.schoolClass?.name || null,
            sectionName: s.section?.name || null,
            totalFee: t.payable,
            paid: t.paid,
            pending,
            status: t.payable === 0 ? 'none' : pending <= 0 ? 'paid' : t.paid > 0 ? 'partial' : 'pending',
        };
    });

    // Status filter totals par lagta hai, isliye DB me nahi ho sakta
    if (req.query.status) items = items.filter((i) => i.status === req.query.status);

    res.json({ success: true, data: paginated({ rows: items, count, page, limit }) });
});

/** Ek student ka poora fee ledger - har head + uske payments. */
export const studentLedger = asyncHandler(async (req, res) => {
    const student = await Student.findOne({
        where: scopedWhere(req, { id: req.params.studentId }),
        attributes: ['id', 'admissionNo', 'firstName', 'lastName', 'rollNo'],
        include: [
            { model: SchoolClass, as: 'schoolClass', attributes: ['id', 'name'] },
            { model: Section, as: 'section', attributes: ['id', 'name'] },
        ],
    });
    if (!student) throw ApiError.notFound('Student not found');

    const fees = await StudentFee.findAll({
        where: { studentId: student.id },
        include: [{ model: FeeHead, as: 'feeHead', attributes: ['id', 'name', 'code', 'frequency'] }],
        order: [['id', 'ASC']],
    });

    const payments = await FeePayment.findAll({
        where: { studentId: student.id },
        include: [
            { model: User, as: 'collectedBy', attributes: ['id', 'name'] },
            {
                model: StudentFee,
                as: 'studentFee',
                attributes: ['id'],
                include: [{ model: FeeHead, as: 'feeHead', attributes: ['name'] }],
            },
        ],
        order: [['paidOn', 'DESC'], ['id', 'DESC']],
    });

    let totalFee = 0;
    let totalPaid = 0;
    const lines = fees.map((f) => {
        const payable = money(Number(f.amount) - Number(f.discount));
        const paid = money(f.paidAmount);
        if (f.status !== 'waived') {
            totalFee += payable;
            totalPaid += paid;
        }
        return {
            id: f.id,
            feeHead: f.feeHead?.name || '-',
            code: f.feeHead?.code || null,
            frequency: f.feeHead?.frequency || null,
            amount: money(f.amount),
            discount: money(f.discount),
            payable,
            paid,
            pending: Math.max(0, money(payable - paid)),
            dueDate: f.dueDate,
            status: f.status,
            remarks: f.remarks,
        };
    });

    res.json({
        success: true,
        data: {
            student: {
                id: student.id,
                admissionNo: student.admissionNo,
                name: [student.firstName, student.lastName].filter(Boolean).join(' '),
                rollNo: student.rollNo,
                className: student.schoolClass?.name || null,
                sectionName: student.section?.name || null,
            },
            summary: {
                totalFee: money(totalFee),
                paid: money(totalPaid),
                pending: Math.max(0, money(totalFee - totalPaid)),
                percent: totalFee ? Math.round((totalPaid / totalFee) * 100) : 0,
            },
            lines,
            payments: payments.map((p) => ({
                id: p.id,
                receiptNo: p.receiptNo,
                amount: money(p.amount),
                mode: p.mode,
                reference: p.reference,
                paidOn: p.paidOn,
                feeHead: p.studentFee?.feeHead?.name || '-',
                collectedBy: p.collectedBy?.name || null,
                remarks: p.remarks,
            })),
        },
    });
});

/**
 * Payment lena. Ek transaction me: receipt banti hai, fee line ka paidAmount
 * badhta hai aur status recalculate hota hai - teeno saath, warna ledger
 * aur receipts ka total mismatch ho jayega.
 */
export const collect = asyncHandler(async (req, res) => {
    const { studentFeeId, amount, mode, reference, paidOn, remarks } = req.body;
    // Online payment sirf gateway se aata hai - counter par "online" mode nahi
    if (mode === 'online') throw ApiError.badRequest('Online mode sirf gateway payment ke liye hai');
    await findScoped(StudentFee, req, studentFeeId);

    const { payment, fee, pending } = await sequelize.transaction((t) =>
        recordPayment({ schoolId: req.schoolId, studentFeeId, amount, mode, reference, paidOn, collectedById: req.user.id, remarks }, t)
    );
    receiptMessage(req.schoolId, fee.studentId, money(payment.amount), payment.receiptNo);

    res.status(201).json({
        success: true,
        message: 'Payment record ho gaya - receipt ' + payment.receiptNo,
        data: {
            id: payment.id,
            receiptNo: payment.receiptNo,
            amount: money(payment.amount),
            mode: payment.mode,
            paidOn: payment.paidOn,
            feeHead: fee.feeHead?.name || null,
            remainingPending: Math.max(0, money(pending - money(amount))),
        },
    });
});

/** Receipt ka message parent ko (background me). */
export async function receiptMessage(schoolId, studentId, amount, receiptNo) {
    const s = await Student.findByPk(studentId, { attributes: ['id', 'firstName', 'lastName', 'guardianPhone'] });
    if (!s) return;
    notify(schoolId, 'feeReceipt', [
        {
            phone: s.guardianPhone,
            studentId: s.id,
            vars: { student: [s.firstName, s.lastName].filter(Boolean).join(' '), amount: amount.toLocaleString('en-IN'), receipt: receiptNo },
            dedupeKey: 'receipt:' + receiptNo,
        },
    ]);
}

export const reminderSchema = z.object({
    classId: z.coerce.number().int().positive().optional(),
    sectionId: z.coerce.number().int().positive().optional(),
});

/**
 * Baaki fees wale students ke parents ko reminder - ek student ko din me ek hi baar.
 */
export const sendReminders = asyncHandler(async (req, res) => {
    const ms = await msgSettingsFor(req.schoolId);
    if (ms.provider === 'none' || !ms.events.feeReminder) {
        throw ApiError.badRequest('Fees reminder ka message band hai - Messages page se chalu kijiye');
    }
    const studentWhere = scopedWhere(req, { status: 'active' });
    if (req.body.classId) studentWhere.classId = req.body.classId;
    if (req.body.sectionId) studentWhere.sectionId = req.body.sectionId;

    const rows = await StudentFee.findAll({
        attributes: ['studentId', [literal('SUM(StudentFee.amount - StudentFee.discount - StudentFee.paid_amount)'), 'due']],
        where: scopedWhere(req, { status: ['pending', 'partial'] }),
        include: [{ model: Student, as: 'student', attributes: ['id', 'firstName', 'lastName', 'guardianPhone'], where: studentWhere }],
        group: ['studentId', 'student.id'],
        raw: true,
        nest: true,
    });
    const due = rows.filter((r) => Number(r.due) > 0);
    const date = today();
    logEvent({ action: 'fee.reminders', module: 'Fees', summary: 'Fees reminder bheje - ' + due.length + ' parents' });
    const queued = await notify(
        req.schoolId,
        'feeReminder',
        due.map((r) => ({
            phone: r.student.guardianPhone,
            studentId: r.studentId,
            vars: { student: [r.student.firstName, r.student.lastName].filter(Boolean).join(' '), amount: money(r.due).toLocaleString('en-IN') },
            dedupeKey: 'reminder:' + r.studentId + ':' + date,
        }))
    );
    res.json({
        success: true,
        message: due.length ? due.length + ' parents ko reminder bheja ja raha hai' : 'Kisi ki fees baaki nahi',
        data: { students: due.length, queued: Number(queued) || 0 },
    });
});

/** Payment delete karne par fee line ka paidAmount bhi wapas ghatana zaroori hai. */
export const removePayment = asyncHandler(async (req, res) => {
    const payment = await findScoped(FeePayment, req, req.params.id);

    await sequelize.transaction(async (t) => {
        const fee = await StudentFee.findByPk(payment.studentFeeId, { transaction: t });
        if (fee) {
            fee.paidAmount = Math.max(0, money(Number(fee.paidAmount) - Number(payment.amount)));
            fee.status = statusFor(fee);
            await fee.save({ transaction: t });
        }
        await payment.destroy({ transaction: t });
    });

    res.json({ success: true, message: 'Payment cancel ho gaya aur dues wapas update ho gaye' });
});

export const payments = asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);

    const where = scopedWhere(req);
    if (req.query.studentId) where.studentId = req.query.studentId;
    if (req.query.mode) where.mode = req.query.mode;
    if (req.query.from && req.query.to) where.paidOn = { [Op.between]: [req.query.from, req.query.to] };
    else if (req.query.from) where.paidOn = { [Op.gte]: req.query.from };
    else if (req.query.to) where.paidOn = { [Op.lte]: req.query.to };

    const { rows, count } = await FeePayment.findAndCountAll({
        where,
        include: [
            {
                model: Student,
                as: 'student',
                attributes: ['id', 'admissionNo', 'firstName', 'lastName'],
                include: [{ model: SchoolClass, as: 'schoolClass', attributes: ['name'] }],
            },
            { model: User, as: 'collectedBy', attributes: ['id', 'name'] },
            {
                model: StudentFee,
                as: 'studentFee',
                attributes: ['id'],
                include: [{ model: FeeHead, as: 'feeHead', attributes: ['name'] }],
            },
        ],
        order: [['paidOn', 'DESC'], ['id', 'DESC']],
        limit,
        offset,
        subQuery: false,
    });

    res.json({
        success: true,
        data: paginated({
            rows: rows.map((p) => ({
                id: p.id,
                receiptNo: p.receiptNo,
                amount: money(p.amount),
                mode: p.mode,
                reference: p.reference,
                paidOn: p.paidOn,
                remarks: p.remarks,
                feeHead: p.studentFee?.feeHead?.name || '-',
                collectedBy: p.collectedBy?.name || null,
                student: p.student
                    ? {
                          id: p.student.id,
                          admissionNo: p.student.admissionNo,
                          name: [p.student.firstName, p.student.lastName].filter(Boolean).join(' '),
                          className: p.student.schoolClass?.name || null,
                      }
                    : null,
            })),
            count,
            page,
            limit,
        }),
    });
});

/** Dashboard aur Fees page ke top cards ke liye - ek hi jagah se. */
export async function feeSnapshot(req) {
    const totals = await StudentFee.findOne({
        attributes: [
            [fn('SUM', literal('amount - discount')), 'payable'],
            [fn('SUM', col('paid_amount')), 'paid'],
        ],
        where: scopedWhere(req, { status: { [Op.ne]: 'waived' } }),
        raw: true,
    });

    const payable = money(totals?.payable);
    const paid = money(totals?.paid);

    // Is mahine kitna collect hua
    const monthStart = new Date().toISOString().slice(0, 8) + '01';
    const monthRow = await FeePayment.findOne({
        attributes: [[fn('SUM', col('amount')), 'total']],
        where: scopedWhere(req, { paidOn: { [Op.gte]: monthStart } }),
        raw: true,
    });

    const defaulters = await StudentFee.count({
        where: scopedWhere(req, { status: ['pending', 'partial'] }),
        distinct: true,
        col: 'studentId',
    });

    return {
        totalFee: payable,
        collected: paid,
        pending: Math.max(0, money(payable - paid)),
        percent: payable ? Math.round((paid / payable) * 100) : 0,
        collectedThisMonth: money(monthRow?.total),
        studentsWithDues: defaulters,
    };
}

export const summary = asyncHandler(async (req, res) => {
    const snapshot = await feeSnapshot(req);

    // Pichhle 6 mahine ka collection - chart ke liye
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setMonth(start.getMonth() - 5, 1);

    const monthly = await FeePayment.findAll({
        attributes: [
            [fn('DATE_FORMAT', col('paid_on'), '%Y-%m'), 'month'],
            [fn('SUM', col('amount')), 'total'],
        ],
        where: scopedWhere(req, { paidOn: { [Op.gte]: start.toISOString().slice(0, 10) } }),
        group: [literal('month')],
        order: [literal('month ASC')],
        raw: true,
    });
    const byMonth = Object.fromEntries(monthly.map((m) => [m.month, money(m.total)]));

    const trend = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - i);
        const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        trend.push({
            month: key,
            label: d.toLocaleDateString('en-IN', { month: 'short' }),
            collected: byMonth[key] || 0,
        });
    }

    // Kaunse mode se kitna aaya
    const byMode = await FeePayment.findAll({
        attributes: ['mode', [fn('SUM', col('amount')), 'total'], [fn('COUNT', col('id')), 'count']],
        where: scopedWhere(req),
        group: ['mode'],
        raw: true,
    });

    // Head wise kitna baaki hai
    const byHead = await StudentFee.findAll({
        attributes: [
            'feeHeadId',
            // FeeHead me bhi 'amount' column hai - qualify karna zaroori hai
            [fn('SUM', literal('StudentFee.amount - StudentFee.discount')), 'payable'],
            [fn('SUM', col('StudentFee.paid_amount')), 'paid'],
        ],
        where: scopedWhere(req, { status: { [Op.ne]: 'waived' } }),
        include: [{ model: FeeHead, as: 'feeHead', attributes: ['name'] }],
        group: ['feeHeadId', 'feeHead.id'],
        raw: true,
        nest: true,
    });

    res.json({
        success: true,
        data: {
            ...snapshot,
            trend,
            byMode: byMode.map((m) => ({
                mode: m.mode,
                total: money(m.total),
                count: Number(m.count),
            })),
            byHead: byHead.map((h) => ({
                name: h.feeHead?.name || 'Unknown',
                payable: money(h.payable),
                paid: money(h.paid),
                pending: Math.max(0, money(money(h.payable) - money(h.paid))),
            })),
        },
    });
});

/** Mobile app ke liye - ek student ka fee summary + recent payments. */
export async function forStudent(req, studentId) {
    const fees = await StudentFee.findAll({
        where: { studentId, schoolId: req.schoolId },
        include: [{ model: FeeHead, as: 'feeHead', attributes: ['name', 'code'] }],
        order: [['id', 'ASC']],
    });

    let totalFee = 0;
    let paid = 0;
    const lines = fees.map((f) => {
        const payable = money(Number(f.amount) - Number(f.discount));
        const p = money(f.paidAmount);
        if (f.status !== 'waived') {
            totalFee += payable;
            paid += p;
        }
        return {
            id: f.id,
            feeHead: f.feeHead?.name || '-',
            amount: payable,
            paid: p,
            pending: Math.max(0, money(payable - p)),
            dueDate: f.dueDate,
            status: f.status,
        };
    });

    const recent = await FeePayment.findAll({
        where: { studentId, schoolId: req.schoolId },
        include: [
            {
                model: StudentFee,
                as: 'studentFee',
                attributes: ['id'],
                include: [{ model: FeeHead, as: 'feeHead', attributes: ['name'] }],
            },
        ],
        order: [['paidOn', 'DESC']],
        limit: 10,
    });

    return {
        summary: {
            totalFee: money(totalFee),
            paid: money(paid),
            pending: Math.max(0, money(totalFee - paid)),
            percent: totalFee ? Math.round((paid / totalFee) * 100) : 0,
        },
        lines,
        payments: recent.map((p) => ({
            id: p.id,
            receiptNo: p.receiptNo,
            amount: money(p.amount),
            mode: p.mode,
            paidOn: p.paidOn,
            feeHead: p.studentFee?.feeHead?.name || '-',
        })),
    };
}
