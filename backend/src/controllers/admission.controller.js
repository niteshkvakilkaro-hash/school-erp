import { z } from 'zod';
import { Op, fn, col } from 'sequelize';
import {
    sequelize, Admission, AdmissionLog, Student, SchoolClass, Section, User, School,
} from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginated } from '../utils/pagination.js';
import { scopedWhere, findScoped, assertSameTenant } from '../utils/tenant.js';
import { assertStudentSeat } from '../utils/planLimits.js';

/** Kis stage se kahan ja sakte hain. `admitted` sirf admit endpoint se aata hai. */
export const TRANSITIONS = {
    enquiry: ['applied', 'rejected', 'withdrawn'],
    applied: ['interview', 'approved', 'rejected', 'withdrawn'],
    interview: ['approved', 'rejected', 'withdrawn'],
    approved: ['rejected', 'withdrawn'],
    rejected: ['enquiry'],
    withdrawn: ['enquiry'],
    admitted: [],
};
const OPEN = ['enquiry', 'applied', 'interview', 'approved'];

const today = () => new Date().toISOString().slice(0, 10);
const emptyToNull = (v) => (v === '' || v === undefined ? null : v);
const optText = (max) => z.string().trim().max(max).optional().transform(emptyToNull);
const optDate = z
    .preprocess(
        (v) => (v === '' || v === null || v === undefined ? null : v),
        z.coerce.date().transform((d) => d.toISOString().slice(0, 10)).nullable()
    )
    .optional();
const optDateTime = z
    .preprocess((v) => (v === '' || v === null || v === undefined ? null : v), z.coerce.date().nullable())
    .optional();

export const admissionSchema = z.object({
    firstName: z.string().trim().min(1, 'Bachche ka naam chahiye').max(60),
    lastName: optText(60),
    gender: z
        .preprocess((v) => (v === '' ? null : v), z.enum(['male', 'female', 'other']).nullable())
        .optional(),
    dob: optDate,
    classId: z.coerce.number().int().positive({ message: 'Class chuniye' }),
    fatherName: optText(120),
    motherName: optText(120),
    guardianPhone: z
        .string()
        .trim()
        .regex(/^[0-9+\-\s]{7,20}$/, 'Valid phone number daaliye'),
    guardianEmail: z
        .union([z.string().trim().toLowerCase().email('Valid email daaliye'), z.literal('')])
        .optional()
        .transform(emptyToNull),
    address: optText(255),
    city: optText(80),
    previousSchool: optText(160),
    source: z.enum(['walk-in', 'phone', 'website', 'referral', 'social', 'other']).default('walk-in'),
    followUpOn: optDate,
    note: optText(1000),
});
export const admissionUpdateSchema = admissionSchema.omit({ note: true }).partial();

export const statusSchema = z.object({
    status: z.enum(['enquiry', 'applied', 'interview', 'approved', 'rejected', 'withdrawn']),
    note: optText(1000),
    interviewAt: optDateTime,
    followUpOn: optDate,
});

export const noteSchema = z.object({
    note: z.string().trim().min(2, 'Note likhiye').max(1000),
    followUpOn: optDate,
});

export const admitSchema = z.object({
    sectionId: z.coerce.number().int().positive({ message: 'Section chuniye' }),
    admissionNo: optText(30),
    admissionDate: optDate,
    rollNo: optText(20),
});

export const querySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    status: z.enum(['open', 'enquiry', 'applied', 'interview', 'approved', 'admitted', 'rejected', 'withdrawn']).optional(),
    classId: z.coerce.number().int().positive().optional(),
    source: z.enum(['walk-in', 'phone', 'website', 'referral', 'social', 'other']).optional(),
    followUp: z.enum(['due']).optional(),
    search: z.string().trim().optional(),
});

const listIncludes = [
    { model: SchoolClass, as: 'schoolClass', attributes: ['id', 'name'] },
    { model: Student, as: 'student', attributes: ['id', 'admissionNo', 'sectionId'] },
];

function shape(a, d = today()) {
    const json = a.toJSON();
    const open = OPEN.includes(json.status);
    return {
        ...json,
        name: [json.firstName, json.lastName].filter(Boolean).join(' '),
        open,
        followUpDue: Boolean(open && json.followUpOn && json.followUpOn <= d),
        next: TRANSITIONS[json.status],
    };
}

/** ENQ2026-0001 jaisa agla number. */
async function nextNumber(Model, field, prefix, schoolId, t) {
    const last = await Model.findOne({
        where: { schoolId, [field]: { [Op.like]: prefix + '%' } },
        order: [[field, 'DESC']],
        attributes: [field],
        transaction: t,
    });
    const seq = last ? Number.parseInt(last[field].slice(prefix.length), 10) || 0 : 0;
    return prefix + String(seq + 1).padStart(4, '0');
}

const log = (req, admission, t, { from = null, to = null, note = null }) =>
    AdmissionLog.create(
        {
            schoolId: req.schoolId,
            admissionId: admission.id,
            fromStatus: from,
            toStatus: to,
            note,
            userId: req.user.id,
        },
        { transaction: t }
    );

/* ---------------- Read ---------------- */

export const list = asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const where = scopedWhere(req);

    if (req.query.status === 'open') where.status = OPEN;
    else if (req.query.status) where.status = req.query.status;
    if (req.query.classId) where.classId = req.query.classId;
    if (req.query.source) where.source = req.query.source;
    if (req.query.followUp === 'due') {
        where.status = OPEN;
        where.followUpOn = { [Op.lte]: today() };
    }
    if (req.query.search) {
        const q = '%' + req.query.search + '%';
        where[Op.or] = [
            { firstName: { [Op.like]: q } },
            { lastName: { [Op.like]: q } },
            { applicationNo: { [Op.like]: q } },
            { guardianPhone: { [Op.like]: q } },
            { fatherName: { [Op.like]: q } },
        ];
    }

    const { rows, count } = await Admission.findAndCountAll({
        where,
        include: listIncludes,
        order: [['createdAt', 'DESC'], ['id', 'DESC']],
        limit,
        offset,
    });
    const d = today();
    res.json({ success: true, data: paginated({ rows: rows.map((a) => shape(a, d)), count, page, limit }) });
});

export const summary = asyncHandler(async (req, res) => {
    const d = today();
    const monthStart = d.slice(0, 8) + '01';
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const [byStatus, thisMonth, admittedThisMonth, followUpsDue, interviewsToday] = await Promise.all([
        Admission.findAll({
            attributes: ['status', [fn('COUNT', col('id')), 'n']],
            where: scopedWhere(req),
            group: ['status'],
            raw: true,
        }),
        Admission.count({ where: scopedWhere(req, { createdAt: { [Op.gte]: monthStart } }) }),
        Admission.count({ where: scopedWhere(req, { status: 'admitted', admittedOn: { [Op.gte]: monthStart } }) }),
        Admission.count({ where: scopedWhere(req, { status: OPEN, followUpOn: { [Op.lte]: d } }) }),
        Admission.count({
            where: scopedWhere(req, {
                status: 'interview',
                interviewAt: { [Op.gte]: dayStart, [Op.lt]: new Date(dayStart.getTime() + 86400000) },
            }),
        }),
    ]);

    const counts = Object.fromEntries(Object.keys(TRANSITIONS).map((s) => [s, 0]));
    for (const r of byStatus) counts[r.status] = Number(r.n);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const closed = counts.admitted + counts.rejected + counts.withdrawn;

    res.json({
        success: true,
        data: {
            counts,
            total,
            open: OPEN.reduce((s, k) => s + counts[k], 0),
            thisMonth,
            admittedThisMonth,
            followUpsDue,
            interviewsToday,
            // Jo band ho chuki unme se kitni admission tak pahunchi
            conversion: closed ? Math.round((counts.admitted / closed) * 100) : 0,
        },
    });
});

export const getOne = asyncHandler(async (req, res) => {
    const a = await findScoped(Admission, req, req.params.id, {
        include: [
            ...listIncludes,
            { model: User, as: 'createdBy', attributes: ['id', 'name'] },
        ],
    });
    const logs = await AdmissionLog.findAll({
        where: { admissionId: a.id },
        include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
        order: [['createdAt', 'ASC'], ['id', 'ASC']],
    });
    res.json({ success: true, data: { ...shape(a), logs } });
});

/** Class ke sections me kitni seats khali - admit karte waqt section chunne ke liye. */
export const seats = asyncHandler(async (req, res) => {
    const cls = await findScoped(SchoolClass, req, req.params.classId);
    const sections = await Section.findAll({
        where: scopedWhere(req, { classId: cls.id }),
        attributes: ['id', 'name', 'capacity'],
        order: [['name', 'ASC']],
    });
    const filled = await Student.findAll({
        attributes: ['sectionId', [fn('COUNT', col('id')), 'n']],
        where: scopedWhere(req, { classId: cls.id, status: 'active' }),
        group: ['sectionId'],
        raw: true,
    });
    const map = Object.fromEntries(filled.map((r) => [r.sectionId, Number(r.n)]));
    res.json({
        success: true,
        data: sections.map((s) => ({
            id: s.id,
            name: s.name,
            capacity: s.capacity,
            filled: map[s.id] || 0,
            seatsLeft: Math.max(s.capacity - (map[s.id] || 0), 0),
        })),
    });
});

/* ---------------- Write ---------------- */

export const create = asyncHandler(async (req, res) => {
    const { note, ...data } = req.body;
    await assertSameTenant(SchoolClass, req, data.classId, 'Class');

    // Same bachcha, same class, same phone - khuli enquiry pehle se ho to dobara na bane
    const dup = await Admission.findOne({
        where: scopedWhere(req, {
            guardianPhone: data.guardianPhone,
            firstName: data.firstName,
            classId: data.classId,
            status: OPEN,
        }),
    });
    if (dup) {
        throw ApiError.conflict('Is bachche ki enquiry pehle se khuli hai - ' + dup.applicationNo, [
            { field: 'firstName', message: 'Duplicate: ' + dup.applicationNo },
        ]);
    }

    const prefix = 'ENQ' + new Date().getFullYear() + '-';
    const created = await sequelize.transaction(async (t) => {
        // School row lock - do log ek saath enquiry banayein to number na takraye
        await School.findByPk(req.schoolId, { lock: t.LOCK.UPDATE, transaction: t });
        const applicationNo = await nextNumber(Admission, 'applicationNo', prefix, req.schoolId, t);
        const a = await Admission.create(
            { ...data, applicationNo, schoolId: req.schoolId, createdById: req.user.id },
            { transaction: t }
        );
        await log(req, a, t, { to: 'enquiry', note: note || 'Enquiry li gayi (' + data.source + ')' });
        return a;
    });

    const full = await Admission.findByPk(created.id, { include: listIncludes });
    res.status(201).json({ success: true, message: 'Enquiry ' + created.applicationNo + ' ban gayi', data: shape(full) });
});

export const update = asyncHandler(async (req, res) => {
    const a = await findScoped(Admission, req, req.params.id);
    if (a.status === 'admitted') {
        throw ApiError.badRequest('Admission ho chuka hai - ab Student profile se edit kijiye');
    }
    if (req.body.classId && req.body.classId !== a.classId) {
        await assertSameTenant(SchoolClass, req, req.body.classId, 'Class');
    }
    await a.update(req.body);
    const full = await Admission.findByPk(a.id, { include: listIncludes });
    res.json({ success: true, message: 'Details update ho gayi', data: shape(full) });
});

export const changeStatus = asyncHandler(async (req, res) => {
    const { status, note } = req.body;

    const saved = await sequelize.transaction(async (t) => {
        const a = await Admission.findOne({
            where: scopedWhere(req, { id: req.params.id }),
            lock: t.LOCK.UPDATE,
            transaction: t,
        });
        if (!a) throw ApiError.notFound('Admission not found');
        if (!TRANSITIONS[a.status].includes(status)) {
            throw ApiError.badRequest(
                a.status === 'admitted'
                    ? 'Admission ho chuka hai - stage nahi badal sakte'
                    : "'" + a.status + "' se '" + status + "' par nahi ja sakte"
            );
        }

        const patch = { status };
        if (status === 'interview') {
            const at = req.body.interviewAt || a.interviewAt;
            if (!at) {
                throw ApiError.badRequest('Interview ki date/time chahiye', [
                    { field: 'interviewAt', message: 'Date aur time chuniye' },
                ]);
            }
            patch.interviewAt = at;
        }
        if ((status === 'rejected' || status === 'withdrawn') && !note) {
            throw ApiError.badRequest('Reason likhiye', [{ field: 'note', message: 'Kyun band kiya - reason zaroori hai' }]);
        }
        // Band hone par follow-up ka matlab nahi
        if (status === 'rejected' || status === 'withdrawn') patch.followUpOn = null;
        else if (req.body.followUpOn !== undefined) patch.followUpOn = req.body.followUpOn;

        const from = a.status;
        await a.update(patch, { transaction: t });
        await log(req, a, t, { from, to: status, note });
        return a;
    });

    const full = await Admission.findByPk(saved.id, { include: listIncludes });
    res.json({ success: true, message: 'Stage: ' + status, data: shape(full) });
});

export const addNote = asyncHandler(async (req, res) => {
    const a = await findScoped(Admission, req, req.params.id);
    await sequelize.transaction(async (t) => {
        if (req.body.followUpOn !== undefined && OPEN.includes(a.status)) {
            await a.update({ followUpOn: req.body.followUpOn }, { transaction: t });
        }
        await log(req, a, t, { note: req.body.note });
    });
    res.status(201).json({ success: true, message: 'Note save ho gaya' });
});

/**
 * Approved application ko Student banata hai. Admission row, section aur school
 * teeno lock hote hain - ek hi application do baar admit nahi hoti, section
 * ki capacity aur plan ki student limit par bhi race nahi hoti.
 */
export const admit = asyncHandler(async (req, res) => {
    const { sectionId, rollNo } = req.body;
    const admissionDate = req.body.admissionDate || today();

    const student = await sequelize.transaction(async (t) => {
        const a = await Admission.findOne({
            where: scopedWhere(req, { id: req.params.id }),
            lock: t.LOCK.UPDATE,
            transaction: t,
        });
        if (!a) throw ApiError.notFound('Admission not found');
        if (a.status === 'admitted') throw ApiError.conflict('Ye application pehle hi admit ho chuki hai');
        if (a.status !== 'approved') throw ApiError.badRequest('Pehle application approve kijiye');

        const section = await Section.findOne({
            where: scopedWhere(req, { id: sectionId }),
            lock: t.LOCK.UPDATE,
            transaction: t,
        });
        if (!section) throw ApiError.badRequest('Section is school me nahi hai', [{ field: 'sectionId', message: 'Section chuniye' }]);
        if (section.classId !== a.classId) {
            throw ApiError.badRequest('Ye section application wali class ka nahi hai', [
                { field: 'sectionId', message: 'Isi class ka section chuniye' },
            ]);
        }
        const filled = await Student.count({ where: { sectionId: section.id, status: 'active' }, transaction: t });
        if (filled >= section.capacity) {
            throw ApiError.conflict('Section ' + section.name + ' full hai (' + filled + '/' + section.capacity + ')', [
                { field: 'sectionId', message: 'Doosra section chuniye' },
            ]);
        }

        await assertStudentSeat(req, t);

        let admissionNo = req.body.admissionNo;
        if (admissionNo) {
            const clash = await Student.findOne({ where: { schoolId: req.schoolId, admissionNo }, transaction: t });
            if (clash) {
                throw ApiError.conflict('Ye admission number pehle se hai', [
                    { field: 'admissionNo', message: 'Doosra number daaliye ya khaali chhodiye' },
                ]);
            }
        } else {
            admissionNo = await nextNumber(Student, 'admissionNo', 'ADM' + new Date().getFullYear() + '-', req.schoolId, t);
        }

        const s = await Student.create(
            {
                schoolId: req.schoolId,
                admissionNo,
                firstName: a.firstName,
                lastName: a.lastName,
                gender: a.gender,
                dob: a.dob,
                classId: a.classId,
                sectionId: section.id,
                rollNo: rollNo || null,
                fatherName: a.fatherName,
                motherName: a.motherName,
                guardianPhone: a.guardianPhone,
                guardianEmail: a.guardianEmail,
                address: a.address,
                city: a.city,
                admissionDate,
                status: 'active',
            },
            { transaction: t }
        );

        await a.update({ status: 'admitted', studentId: s.id, admittedOn: admissionDate, followUpOn: null }, { transaction: t });
        await log(req, a, t, {
            from: 'approved',
            to: 'admitted',
            note: 'Student ' + admissionNo + ' bana - section ' + section.name,
        });
        return s;
    });

    res.status(201).json({
        success: true,
        message: 'Admission ho gaya - ' + student.admissionNo,
        data: { studentId: student.id, admissionNo: student.admissionNo },
    });
});

export const remove = asyncHandler(async (req, res) => {
    const a = await findScoped(Admission, req, req.params.id);
    if (a.status === 'admitted') throw ApiError.conflict('Admit ho chuki application delete nahi hoti - record ke liye rehti hai');
    await a.destroy();
    res.json({ success: true, message: 'Enquiry delete ho gayi' });
});
