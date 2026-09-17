import { z } from 'zod';
import { Op, literal } from 'sequelize';
import {
    sequelize, Exam, ExamSubject, Mark, Student, Subject, SchoolClass, Section,
} from '../models/index.js';
import { EXAM_TYPES } from '../models/Exam.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginated } from '../utils/pagination.js';
import { scopedWhere, findScoped, assertSameTenant } from '../utils/tenant.js';

const dateStr = z.coerce.date().transform((d) => d.toISOString().slice(0, 10));
const optionalFk = z
    .preprocess(
        (v) => (v === '' || v === null || v === undefined ? null : v),
        z.coerce.number().int().positive().nullable()
    )
    .optional();

export const examCreateSchema = z
    .object({
        name: z.string().trim().min(2, 'Exam ka naam chahiye').max(120),
        type: z.enum(EXAM_TYPES).default('unit-test'),
        classId: optionalFk,
        startDate: dateStr,
        endDate: dateStr,
        description: z.string().trim().max(255).optional(),
    })
    .refine((d) => d.endDate >= d.startDate, {
        message: 'End date, start date se pehle nahi ho sakti',
        path: ['endDate'],
    });

export const examUpdateSchema = z.object({
    name: z.string().trim().min(2).max(120).optional(),
    type: z.enum(EXAM_TYPES).optional(),
    classId: optionalFk,
    startDate: dateStr.optional(),
    endDate: dateStr.optional(),
    description: z.string().trim().max(255).optional(),
});

export const examQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().trim().optional(),
    classId: z.coerce.number().int().positive().optional(),
    type: z.enum(EXAM_TYPES).optional(),
    status: z.enum(['upcoming', 'ongoing', 'completed']).optional(),
});

export const scheduleSchema = z
    .object({
        subjectId: z.coerce.number().int().positive({ message: 'Subject chuniye' }),
        examDate: dateStr,
        startTime: z.string().trim().max(5).optional(),
        endTime: z.string().trim().max(5).optional(),
        maxMarks: z.coerce.number().int().min(1).max(1000).default(100),
        passMarks: z.coerce.number().int().min(0).max(1000).default(33),
        roomNo: z.string().trim().max(20).optional(),
    })
    .refine((d) => d.passMarks <= d.maxMarks, {
        message: 'Pass marks, max marks se zyada nahi ho sakte',
        path: ['passMarks'],
    });

export const marksSchema = z.object({
    entries: z
        .array(
            z.object({
                studentId: z.coerce.number().int().positive(),
                marksObtained: z
                    .preprocess(
                        (v) => (v === '' || v === null || v === undefined ? null : v),
                        z.coerce.number().min(0).nullable()
                    )
                    .optional(),
                isAbsent: z.coerce.boolean().default(false),
                remarks: z.string().trim().max(255).optional(),
            })
        )
        .min(1, 'Kam se kam ek entry bhejiye'),
});

/** CBSE jaisa simple grade scale - report card me dikhta hai. */
export function gradeFor(percent) {
    if (percent === null || percent === undefined) return null;
    if (percent >= 91) return 'A1';
    if (percent >= 81) return 'A2';
    if (percent >= 71) return 'B1';
    if (percent >= 61) return 'B2';
    if (percent >= 51) return 'C1';
    if (percent >= 41) return 'C2';
    if (percent >= 33) return 'D';
    return 'E';
}

const examIncludes = [
    { model: SchoolClass, as: 'schoolClass', attributes: ['id', 'name', 'level'] },
    {
        model: ExamSubject,
        as: 'schedule',
        include: [{ model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] }],
    },
];

const withStatus = (exam) => ({ ...exam.toJSON(), status: exam.computedStatus() });

export const list = asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const today = new Date().toISOString().slice(0, 10);

    const where = scopedWhere(req);
    if (req.query.classId) where.classId = req.query.classId;
    if (req.query.type) where.type = req.query.type;
    if (req.query.search) where.name = { [Op.like]: '%' + req.query.search + '%' };

    // Status date se nikalta hai, isliye filter bhi date par hi lagta hai
    if (req.query.status === 'upcoming') where.startDate = { [Op.gt]: today };
    if (req.query.status === 'completed') where.endDate = { [Op.lt]: today };
    if (req.query.status === 'ongoing') {
        where.startDate = { [Op.lte]: today };
        where.endDate = { [Op.gte]: today };
    }

    // Schedule (hasMany) ko list me join nahi karte: subQuery:false ke saath
    // LIMIT joined rows par lagta hai, to 5 papers wala exam 5 slots kha jaata.
    // List ko sirf ginti chahiye, isliye literal subquery se count le lete hain.
    const { rows, count } = await Exam.findAndCountAll({
        where,
        attributes: {
            include: [
                [
                    literal('(SELECT COUNT(*) FROM exam_subjects es WHERE es.exam_id = Exam.id)'),
                    'paperCount',
                ],
            ],
        },
        include: [{ model: SchoolClass, as: 'schoolClass', attributes: ['id', 'name', 'level'] }],
        order: [['startDate', 'DESC']],
        limit,
        offset,
        distinct: true,
        subQuery: false,
    });

    res.json({
        success: true,
        data: paginated({
            rows: rows.map((e) => ({ ...withStatus(e), paperCount: Number(e.get('paperCount')) })),
            count,
            page,
            limit,
        }),
    });
});

export const getOne = asyncHandler(async (req, res) => {
    const exam = await findScoped(Exam, req, req.params.id, { include: examIncludes });
    res.json({ success: true, data: withStatus(exam) });
});

export const create = asyncHandler(async (req, res) => {
    await assertSameTenant(SchoolClass, req, req.body.classId, 'Class');
    const exam = await Exam.create({ ...req.body, schoolId: req.schoolId });
    const full = await Exam.findByPk(exam.id, { include: examIncludes });
    res.status(201).json({ success: true, message: 'Exam ban gaya', data: withStatus(full) });
});

export const update = asyncHandler(async (req, res) => {
    const exam = await findScoped(Exam, req, req.params.id);
    await assertSameTenant(SchoolClass, req, req.body.classId, 'Class');

    const startDate = req.body.startDate ?? exam.startDate;
    const endDate = req.body.endDate ?? exam.endDate;
    if (endDate < startDate) {
        throw ApiError.badRequest('End date, start date se pehle nahi ho sakti', [
            { field: 'endDate', message: 'Start date ke baad ki date chuniye' },
        ]);
    }

    await exam.update(req.body);
    const full = await Exam.findByPk(exam.id, { include: examIncludes });
    res.json({ success: true, message: 'Exam update ho gaya', data: withStatus(full) });
});

export const remove = asyncHandler(async (req, res) => {
    const exam = await findScoped(Exam, req, req.params.id);

    // Marks bhare ja chuke hon to galti se delete na ho jaye
    const marked = await Mark.count({
        include: [{ model: ExamSubject, as: 'examSubject', where: { examId: exam.id }, attributes: [] }],
    });
    if (marked > 0) {
        throw ApiError.conflict(
            'Is exam ke ' + marked + ' marks bhare ja chuke hain - pehle unhe hataiye'
        );
    }

    await exam.destroy();
    res.json({ success: true, message: 'Exam delete ho gaya' });
});

export const publish = asyncHandler(async (req, res) => {
    const exam = await findScoped(Exam, req, req.params.id);
    const next = !exam.resultsPublished;

    if (next && exam.computedStatus() === 'upcoming') {
        throw ApiError.badRequest('Exam shuru hone se pehle result publish nahi kar sakte');
    }

    await exam.update({ resultsPublished: next });
    res.json({
        success: true,
        message: next ? 'Results publish ho gaye' : 'Results ab chhupe hue hain',
        data: { resultsPublished: next },
    });
});

/* ---------------- Datesheet (exam subjects) ---------------- */

export const addSchedule = asyncHandler(async (req, res) => {
    const exam = await findScoped(Exam, req, req.params.id);
    const subject = await assertSameTenant(Subject, req, req.body.subjectId, 'Subject');

    // Class-specific exam me doosri class ka subject nahi aana chahiye
    if (exam.classId && subject.classId && Number(subject.classId) !== Number(exam.classId)) {
        throw ApiError.badRequest('Ye subject is exam ki class ka nahi hai', [
            { field: 'subjectId', message: 'Exam ki class ka subject chuniye' },
        ]);
    }

    if (req.body.examDate < exam.startDate || req.body.examDate > exam.endDate) {
        throw ApiError.badRequest('Paper ki date exam ke andar honi chahiye', [
            { field: 'examDate', message: exam.startDate + ' se ' + exam.endDate + ' ke beech' },
        ]);
    }

    const exists = await ExamSubject.findOne({
        where: { examId: exam.id, subjectId: req.body.subjectId },
    });
    if (exists) throw ApiError.conflict('Is subject ka paper pehle se schedule hai');

    const row = await ExamSubject.create({
        ...req.body,
        examId: exam.id,
        schoolId: req.schoolId,
    });
    const full = await ExamSubject.findByPk(row.id, {
        include: [{ model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] }],
    });
    res.status(201).json({ success: true, message: 'Paper schedule ho gaya', data: full });
});

export const removeSchedule = asyncHandler(async (req, res) => {
    const row = await findScoped(ExamSubject, req, req.params.scheduleId);

    const marked = await Mark.count({ where: { examSubjectId: row.id } });
    if (marked > 0) {
        throw ApiError.conflict('Is paper ke ' + marked + ' students ke marks bhare hue hain');
    }

    await row.destroy();
    res.json({ success: true, message: 'Paper hata diya gaya' });
});

/* ---------------- Marks entry ---------------- */

/** Ek paper ki marks sheet: students + jo marks pehle se bhare hain. */
export const marksSheet = asyncHandler(async (req, res) => {
    const examSubject = await findScoped(ExamSubject, req, req.params.scheduleId, {
        include: [
            { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
            { model: Exam, as: 'exam', attributes: ['id', 'name', 'classId', 'resultsPublished'] },
        ],
    });

    const where = scopedWhere(req, { status: 'active' });
    const classId = examSubject.exam?.classId || examSubject.subject?.classId;
    if (classId) where.classId = classId;

    const students = await Student.findAll({
        where,
        attributes: ['id', 'admissionNo', 'firstName', 'lastName', 'rollNo'],
        include: [{ model: Section, as: 'section', attributes: ['id', 'name'] }],
        order: [['rollNo', 'ASC']],
    });

    const existing = await Mark.findAll({ where: { examSubjectId: examSubject.id } });
    const byStudent = Object.fromEntries(existing.map((m) => [m.studentId, m]));

    res.json({
        success: true,
        data: {
            examSubject,
            rows: students.map((s) => {
                const m = byStudent[s.id];
                return {
                    studentId: s.id,
                    admissionNo: s.admissionNo,
                    name: [s.firstName, s.lastName].filter(Boolean).join(' '),
                    rollNo: s.rollNo,
                    sectionName: s.section?.name || null,
                    marksObtained: m?.marksObtained != null ? Number(m.marksObtained) : null,
                    isAbsent: m?.isAbsent || false,
                    remarks: m?.remarks || '',
                };
            }),
        },
    });
});

export const saveMarks = asyncHandler(async (req, res) => {
    const examSubject = await findScoped(ExamSubject, req, req.params.scheduleId);
    const { entries } = req.body;

    const over = entries.find(
        (e) => e.marksObtained != null && Number(e.marksObtained) > examSubject.maxMarks
    );
    if (over) {
        throw ApiError.badRequest(
            'Marks max ' + examSubject.maxMarks + ' se zyada nahi ho sakte (student #' + over.studentId + ')'
        );
    }

    const ids = entries.map((e) => e.studentId);
    const valid = await Student.count({ where: scopedWhere(req, { id: ids }) });
    if (valid !== ids.length) throw ApiError.badRequest('Kuch students aapke school ke nahi hain');

    await sequelize.transaction(async (t) =>
        Mark.bulkCreate(
            entries.map((e) => ({
                schoolId: req.schoolId,
                examSubjectId: examSubject.id,
                studentId: e.studentId,
                // Absent hai to marks ka matlab nahi
                marksObtained: e.isAbsent ? null : (e.marksObtained ?? null),
                isAbsent: e.isAbsent,
                remarks: e.remarks || null,
                enteredById: req.user.id,
            })),
            {
                transaction: t,
                updateOnDuplicate: ['marksObtained', 'isAbsent', 'remarks', 'enteredById', 'updatedAt'],
            }
        )
    );

    res.json({ success: true, message: entries.length + ' entries save ho gayi' });
});

/* ---------------- Report card ---------------- */

/**
 * Ek student ka ek exam ka result. `onlyPublished` true hone par (mobile app)
 * unpublished exam ka result nahi milta.
 */
export async function studentResult(req, examId, studentId, { onlyPublished = false } = {}) {
    const exam = await Exam.findOne({
        where: scopedWhere(req, { id: examId }),
        include: [{ model: SchoolClass, as: 'schoolClass', attributes: ['id', 'name'] }],
    });
    if (!exam) throw ApiError.notFound('Exam not found');
    if (onlyPublished && !exam.resultsPublished) {
        throw ApiError.forbidden('Is exam ka result abhi publish nahi hua');
    }

    const schedule = await ExamSubject.findAll({
        where: { examId: exam.id },
        include: [{ model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] }],
        order: [['examDate', 'ASC']],
    });

    const marks = await Mark.findAll({
        where: { studentId, examSubjectId: schedule.map((s) => s.id) },
    });
    const byPaper = Object.fromEntries(marks.map((m) => [m.examSubjectId, m]));

    let totalMax = 0;
    let totalGot = 0;
    let anyMissing = false;

    const subjects = schedule.map((paper) => {
        const m = byPaper[paper.id];
        const got = m && !m.isAbsent && m.marksObtained != null ? Number(m.marksObtained) : null;

        if (got === null) anyMissing = true;
        totalMax += paper.maxMarks;
        totalGot += got ?? 0;

        const percent = got === null ? null : Math.round((got / paper.maxMarks) * 100);
        return {
            examSubjectId: paper.id,
            subject: paper.subject?.name || null,
            code: paper.subject?.code || null,
            examDate: paper.examDate,
            maxMarks: paper.maxMarks,
            passMarks: paper.passMarks,
            marksObtained: got,
            isAbsent: m?.isAbsent || false,
            percent,
            grade: gradeFor(percent),
            passed: got === null ? null : got >= paper.passMarks,
        };
    });

    const overallPercent = totalMax ? Math.round((totalGot / totalMax) * 1000) / 10 : null;
    const failed = subjects.filter((s) => s.passed === false).length;

    return {
        exam: {
            id: exam.id,
            name: exam.name,
            type: exam.type,
            className: exam.schoolClass?.name || null,
            startDate: exam.startDate,
            endDate: exam.endDate,
            resultsPublished: exam.resultsPublished,
        },
        subjects,
        summary: {
            totalMax,
            totalObtained: totalGot,
            percent: overallPercent,
            grade: gradeFor(overallPercent),
            failedSubjects: failed,
            // Koi paper bhara hi nahi to pass/fail kehna galat hoga
            result: anyMissing ? 'incomplete' : failed > 0 ? 'fail' : 'pass',
        },
    };
}

export const reportCard = asyncHandler(async (req, res) => {
    const student = await Student.findOne({
        where: scopedWhere(req, { id: req.params.studentId }),
        attributes: ['id', 'admissionNo', 'firstName', 'lastName', 'rollNo'],
        include: [
            { model: SchoolClass, as: 'schoolClass', attributes: ['id', 'name'] },
            { model: Section, as: 'section', attributes: ['id', 'name'] },
        ],
    });
    if (!student) throw ApiError.notFound('Student not found');

    const result = await studentResult(req, req.params.id, student.id);
    res.json({ success: true, data: { student, ...result } });
});

/** Poori class ka result table - topper nikalne ke liye. */
export const classResult = asyncHandler(async (req, res) => {
    const exam = await findScoped(Exam, req, req.params.id);

    const schedule = await ExamSubject.findAll({ where: { examId: exam.id }, attributes: ['id', 'maxMarks'] });
    if (schedule.length === 0) {
        return res.json({ success: true, data: { exam, rows: [], totalMax: 0 } });
    }

    const totalMax = schedule.reduce((sum, s) => sum + s.maxMarks, 0);

    const where = scopedWhere(req, { status: 'active' });
    if (exam.classId) where.classId = exam.classId;

    const students = await Student.findAll({
        where,
        attributes: ['id', 'admissionNo', 'firstName', 'lastName', 'rollNo'],
        include: [{ model: Section, as: 'section', attributes: ['id', 'name'] }],
    });

    const marks = await Mark.findAll({ where: { examSubjectId: schedule.map((s) => s.id) } });
    const tally = {};
    for (const m of marks) {
        if (m.isAbsent || m.marksObtained == null) continue;
        tally[m.studentId] = (tally[m.studentId] || 0) + Number(m.marksObtained);
    }

    const rows = students
        .map((s) => {
            const got = tally[s.id] ?? null;
            const percent = got === null ? null : Math.round((got / totalMax) * 1000) / 10;
            return {
                studentId: s.id,
                admissionNo: s.admissionNo,
                name: [s.firstName, s.lastName].filter(Boolean).join(' '),
                rollNo: s.rollNo,
                sectionName: s.section?.name || null,
                totalObtained: got,
                percent,
                grade: gradeFor(percent),
            };
        })
        .sort((a, b) => (b.percent ?? -1) - (a.percent ?? -1))
        .map((r, i) => ({ ...r, rank: r.percent === null ? null : i + 1 }));

    res.json({ success: true, data: { exam: { ...exam.toJSON(), status: exam.computedStatus() }, totalMax, rows } });
});
