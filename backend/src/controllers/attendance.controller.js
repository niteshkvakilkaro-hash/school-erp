import { z } from 'zod';
import { Op, fn, col, literal } from 'sequelize';
import { sequelize, Attendance, Student, SchoolClass, Section, User } from '../models/index.js';
import { ATTENDANCE_STATUS } from '../models/Attendance.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { scopedWhere, assertSameTenant } from '../utils/tenant.js';

const today = () => new Date().toISOString().slice(0, 10);
const dateStr = z.coerce.date().transform((d) => d.toISOString().slice(0, 10));

export const rosterQuerySchema = z.object({
    classId: z.coerce.number().int().positive({ message: 'Class chuniye' }),
    sectionId: z.coerce.number().int().positive().optional(),
    date: dateStr.optional(),
});

export const bulkSchema = z.object({
    classId: z.coerce.number().int().positive(),
    sectionId: z.coerce.number().int().positive().nullable().optional(),
    date: dateStr,
    entries: z
        .array(
            z.object({
                studentId: z.coerce.number().int().positive(),
                status: z.enum(ATTENDANCE_STATUS),
                remarks: z.string().trim().max(255).optional(),
            })
        )
        .min(1, 'Kam se kam ek student ka status bhejiye'),
});

export const reportQuerySchema = z.object({
    classId: z.coerce.number().int().positive().optional(),
    sectionId: z.coerce.number().int().positive().optional(),
    from: dateStr.optional(),
    to: dateStr.optional(),
});

export const studentQuerySchema = z.object({
    from: dateStr.optional(),
    to: dateStr.optional(),
});

const emptyCounts = () => ({ present: 0, absent: 0, leave: 0, 'half-day': 0 });

/**
 * Attendance sheet: us class/section ke saare active students, aur agar us din
 * ka record pehle se hai to uska status bhi. Frontend isi ek call se sheet bhar
 * leta hai - do alag call ki zaroorat nahi.
 */
export const roster = asyncHandler(async (req, res) => {
    const date = req.query.date || today();

    await assertSameTenant(SchoolClass, req, req.query.classId, 'Class');
    if (req.query.sectionId) await assertSameTenant(Section, req, req.query.sectionId, 'Section');

    const where = scopedWhere(req, { status: 'active', classId: req.query.classId });
    if (req.query.sectionId) where.sectionId = req.query.sectionId;

    const students = await Student.findAll({
        where,
        attributes: ['id', 'admissionNo', 'firstName', 'lastName', 'rollNo'],
        include: [{ model: Section, as: 'section', attributes: ['id', 'name'] }],
        order: [
            ['rollNo', 'ASC'],
            ['firstName', 'ASC'],
        ],
    });

    const existing = await Attendance.findAll({
        where: scopedWhere(req, { date, studentId: students.map((s) => s.id) }),
        include: [{ model: User, as: 'markedBy', attributes: ['id', 'name'] }],
    });
    const byStudent = Object.fromEntries(existing.map((a) => [a.studentId, a]));

    const counts = emptyCounts();
    const rows = students.map((s) => {
        const record = byStudent[s.id];
        if (record) counts[record.status] = (counts[record.status] || 0) + 1;
        return {
            studentId: s.id,
            admissionNo: s.admissionNo,
            name: [s.firstName, s.lastName].filter(Boolean).join(' '),
            rollNo: s.rollNo,
            sectionName: s.section?.name || null,
            status: record ? record.status : null,
            remarks: record?.remarks || '',
        };
    });

    res.json({
        success: true,
        data: {
            date,
            alreadyMarked: existing.length > 0,
            markedBy: existing[0]?.markedBy?.name || null,
            totals: { students: rows.length, marked: existing.length, ...counts },
            rows,
        },
    });
});

/**
 * Poori class ek saath mark hoti hai. Pehle se mark hone par update ho jata hai
 * (upsert) - isliye teacher galti sudhar sakta hai.
 */
export const markBulk = asyncHandler(async (req, res) => {
    const { classId, sectionId, date, entries } = req.body;

    if (date > today()) {
        throw ApiError.badRequest('Aane wali date ki attendance mark nahi kar sakte', [
            { field: 'date', message: 'Aaj ya pichhli date chuniye' },
        ]);
    }

    await assertSameTenant(SchoolClass, req, classId, 'Class');
    if (sectionId) await assertSameTenant(Section, req, sectionId, 'Section');

    // Saare students isi school ke aur isi class ke hone chahiye
    const ids = entries.map((e) => e.studentId);
    const valid = await Student.findAll({
        where: scopedWhere(req, { id: ids, classId }),
        attributes: ['id', 'sectionId'],
    });
    if (valid.length !== ids.length) {
        throw ApiError.badRequest('Kuch students is class ke nahi hain ya exist nahi karte');
    }
    const sectionOf = Object.fromEntries(valid.map((s) => [s.id, s.sectionId]));

    const rows = entries.map((e) => ({
        schoolId: req.schoolId,
        studentId: e.studentId,
        classId,
        sectionId: sectionId ?? sectionOf[e.studentId] ?? null,
        date,
        status: e.status,
        remarks: e.remarks || null,
        markedById: req.user.id,
    }));

    await sequelize.transaction(async (t) =>
        Attendance.bulkCreate(rows, {
            transaction: t,
            updateOnDuplicate: ['status', 'remarks', 'markedById', 'classId', 'sectionId', 'updatedAt'],
        })
    );

    res.json({
        success: true,
        message: entries.length + ' students ki attendance save ho gayi',
        data: { date, saved: entries.length },
    });
});

/** Class/section ka date-range summary - har student ka present/absent count. */
export const report = asyncHandler(async (req, res) => {
    const to = req.query.to || today();
    const from = req.query.from || to.slice(0, 8) + '01';

    if (from > to) {
        throw ApiError.badRequest('From date, To date se baad ki nahi ho sakti', [
            { field: 'from', message: 'To date se pehle ki date chuniye' },
        ]);
    }

    const studentWhere = scopedWhere(req, { status: 'active' });
    if (req.query.classId) studentWhere.classId = req.query.classId;
    if (req.query.sectionId) studentWhere.sectionId = req.query.sectionId;

    const students = await Student.findAll({
        where: studentWhere,
        attributes: ['id', 'admissionNo', 'firstName', 'lastName', 'rollNo'],
        include: [
            { model: SchoolClass, as: 'schoolClass', attributes: ['id', 'name'] },
            { model: Section, as: 'section', attributes: ['id', 'name'] },
        ],
        order: [['rollNo', 'ASC']],
    });

    if (students.length === 0) {
        return res.json({ success: true, data: { from, to, rows: [], daily: [], totals: emptyCounts() } });
    }

    const ids = students.map((s) => s.id);

    const perStudent = await Attendance.findAll({
        attributes: ['studentId', 'status', [fn('COUNT', col('id')), 'count']],
        where: scopedWhere(req, { studentId: ids, date: { [Op.between]: [from, to] } }),
        group: ['studentId', 'status'],
        raw: true,
    });

    const tally = {};
    const totals = emptyCounts();
    for (const r of perStudent) {
        tally[r.studentId] = tally[r.studentId] || emptyCounts();
        tally[r.studentId][r.status] = Number(r.count);
        totals[r.status] += Number(r.count);
    }

    // Din-wise present % - report ka chart isi se banta hai
    const daily = await Attendance.findAll({
        attributes: [
            'date',
            [fn('COUNT', col('id')), 'total'],
            [fn('SUM', literal("CASE WHEN status = 'present' THEN 1 ELSE 0 END")), 'present'],
        ],
        where: scopedWhere(req, { studentId: ids, date: { [Op.between]: [from, to] } }),
        group: ['date'],
        order: [['date', 'ASC']],
        raw: true,
    });

    const rows = students.map((s) => {
        const c = tally[s.id] || emptyCounts();
        const marked = c.present + c.absent + c.leave + c['half-day'];
        // Half-day ko aadha present gina jata hai
        const effective = c.present + c['half-day'] * 0.5;
        return {
            studentId: s.id,
            admissionNo: s.admissionNo,
            name: [s.firstName, s.lastName].filter(Boolean).join(' '),
            rollNo: s.rollNo,
            className: s.schoolClass?.name || null,
            sectionName: s.section?.name || null,
            ...c,
            marked,
            percent: marked ? Math.round((effective / marked) * 100) : null,
        };
    });

    res.json({
        success: true,
        data: {
            from,
            to,
            totals,
            rows,
            daily: daily.map((d) => ({
                date: d.date,
                total: Number(d.total),
                present: Number(d.present),
                percent: Number(d.total) ? Math.round((Number(d.present) / Number(d.total)) * 100) : 0,
            })),
        },
    });
});

/**
 * Ek student ki attendance history + summary. Admin panel aur mobile app
 * dono isi ko use karte hain (portal apne access check ke baad call karta hai).
 */
export async function studentSummary(req, studentId, { from, to } = {}) {
    const end = to || today();
    const start = from || end.slice(0, 4) + '-01-01';

    const records = await Attendance.findAll({
        where: scopedWhere(req, { studentId, date: { [Op.between]: [start, end] } }),
        attributes: ['id', 'date', 'status', 'remarks'],
        order: [['date', 'DESC']],
        limit: 120,
    });

    const counts = emptyCounts();
    for (const r of records) counts[r.status] = (counts[r.status] || 0) + 1;

    const marked = counts.present + counts.absent + counts.leave + counts['half-day'];
    const effective = counts.present + counts['half-day'] * 0.5;

    return {
        from: start,
        to: end,
        counts,
        marked,
        percent: marked ? Math.round((effective / marked) * 100) : null,
        records,
    };
}

export const byStudent = asyncHandler(async (req, res) => {
    const student = await Student.findOne({
        where: scopedWhere(req, { id: req.params.studentId }),
        attributes: ['id', 'firstName', 'lastName', 'admissionNo'],
    });
    if (!student) throw ApiError.notFound('Student not found');

    const summary = await studentSummary(req, student.id, req.query);
    res.json({ success: true, data: { student, ...summary } });
});

/** Dashboard tile: aaj ki attendance ek line me. */
export async function todaySnapshot(req) {
    const rows = await Attendance.findAll({
        attributes: ['status', [fn('COUNT', col('id')), 'count']],
        where: scopedWhere(req, { date: today() }),
        group: ['status'],
        raw: true,
    });

    const counts = emptyCounts();
    for (const r of rows) counts[r.status] = Number(r.count);

    const marked = counts.present + counts.absent + counts.leave + counts['half-day'];
    const effective = counts.present + counts['half-day'] * 0.5;

    return {
        date: today(),
        marked,
        counts,
        percent: marked ? Math.round((effective / marked) * 100) : null,
    };
}
