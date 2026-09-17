import { z } from 'zod';
import { Op } from 'sequelize';
import {
    Period, TimetableSlot, SchoolClass, Section, Subject, Teacher, User, Student,
} from '../models/index.js';
import { WEEKDAYS } from '../models/TimetableSlot.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { scopedWhere, findScoped, assertSameTenant } from '../utils/tenant.js';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const timeStr = z.string().trim().regex(TIME, 'Time HH:MM format me daaliye');

export const periodSchema = z
    .object({
        name: z.string().trim().min(1, 'Period ka naam chahiye').max(40),
        startTime: timeStr,
        endTime: timeStr,
        sortOrder: z.coerce.number().int().min(0).max(50).default(0),
        isBreak: z.coerce.boolean().default(false),
    })
    .refine((d) => d.endTime > d.startTime, {
        message: 'End time, start time se baad ka hona chahiye',
        path: ['endTime'],
    });

export const periodUpdateSchema = z.object({
    name: z.string().trim().min(1).max(40).optional(),
    startTime: timeStr.optional(),
    endTime: timeStr.optional(),
    sortOrder: z.coerce.number().int().min(0).max(50).optional(),
    isBreak: z.coerce.boolean().optional(),
});

export const slotSchema = z.object({
    classId: z.coerce.number().int().positive({ message: 'Class chuniye' }),
    sectionId: z.coerce.number().int().positive({ message: 'Section chuniye' }),
    periodId: z.coerce.number().int().positive({ message: 'Period chuniye' }),
    dayOfWeek: z.coerce.number().int().min(1).max(6),
    subjectId: z.coerce.number().int().positive({ message: 'Subject chuniye' }),
    teacherId: z
        .preprocess(
            (v) => (v === '' || v === null || v === undefined ? null : v),
            z.coerce.number().int().positive().nullable()
        )
        .optional(),
    roomNo: z.string().trim().max(20).optional(),
});

export const gridQuerySchema = z.object({
    classId: z.coerce.number().int().positive().optional(),
    sectionId: z.coerce.number().int().positive({ message: 'Section chuniye' }),
});

export const teacherQuerySchema = z.object({
    teacherId: z.coerce.number().int().positive().optional(),
});

export const weekdays = WEEKDAYS;

const slotIncludes = [
    { model: Period, as: 'period', attributes: ['id', 'name', 'startTime', 'endTime', 'sortOrder'] },
    { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
    { model: SchoolClass, as: 'schoolClass', attributes: ['id', 'name'] },
    { model: Section, as: 'section', attributes: ['id', 'name'] },
    {
        model: Teacher,
        as: 'teacher',
        attributes: ['id', 'employeeNo'],
        include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
    },
];

/** JS getDay() 0=Sunday deta hai, hum 1-6 (Mon-Sat) use karte hain. */
export const todayDow = () => {
    const d = new Date().getDay();
    return d === 0 ? null : d;
};

/* ---------------- Periods ---------------- */

export const listPeriods = asyncHandler(async (req, res) => {
    const rows = await Period.findAll({
        where: scopedWhere(req),
        order: [
            ['sortOrder', 'ASC'],
            ['startTime', 'ASC'],
        ],
    });
    res.json({ success: true, data: rows });
});

export const createPeriod = asyncHandler(async (req, res) => {
    const clash = await Period.findOne({ where: scopedWhere(req, { name: req.body.name }) });
    if (clash) throw ApiError.conflict('Is naam ka period pehle se hai');

    const item = await Period.create({ ...req.body, schoolId: req.schoolId });
    res.status(201).json({ success: true, message: 'Period ban gaya', data: item });
});

export const updatePeriod = asyncHandler(async (req, res) => {
    const item = await findScoped(Period, req, req.params.id);

    const start = req.body.startTime ?? item.startTime;
    const end = req.body.endTime ?? item.endTime;
    if (end <= start) {
        throw ApiError.badRequest('End time, start time se baad ka hona chahiye', [
            { field: 'endTime', message: 'Start time ke baad ka time chuniye' },
        ]);
    }

    if (req.body.name && req.body.name !== item.name) {
        const clash = await Period.findOne({
            where: scopedWhere(req, { name: req.body.name, id: { [Op.ne]: item.id } }),
        });
        if (clash) throw ApiError.conflict('Is naam ka period pehle se hai');
    }

    // Break banate waqt us period ke saare subjects hat jayenge
    if (req.body.isBreak === true && !item.isBreak) {
        const used = await TimetableSlot.count({ where: { periodId: item.id } });
        if (used > 0) {
            throw ApiError.conflict(
                'Is period me ' + used + ' classes lagi hui hain - pehle unhe hataiye'
            );
        }
    }

    await item.update(req.body);
    res.json({ success: true, message: 'Period update ho gaya', data: item });
});

export const removePeriod = asyncHandler(async (req, res) => {
    const item = await findScoped(Period, req, req.params.id);

    const used = await TimetableSlot.count({ where: { periodId: item.id } });
    if (used > 0) {
        throw ApiError.conflict('Is period me ' + used + ' classes lagi hui hain - pehle unhe hataiye');
    }

    await item.destroy();
    res.json({ success: true, message: 'Period delete ho gaya' });
});

/* ---------------- Timetable grid ---------------- */

/** Ek section ka poora hafta: periods (rows) x days (columns). */
export const grid = asyncHandler(async (req, res) => {
    const section = await assertSameTenant(Section, req, req.query.sectionId, 'Section');

    const periods = await Period.findAll({
        where: scopedWhere(req),
        order: [
            ['sortOrder', 'ASC'],
            ['startTime', 'ASC'],
        ],
    });

    const slots = await TimetableSlot.findAll({
        where: scopedWhere(req, { sectionId: section.id }),
        include: slotIncludes,
    });

    // periodId:dayOfWeek -> slot, taaki frontend seedha lookup kar sake
    const byKey = {};
    for (const s of slots) {
        byKey[s.periodId + ':' + s.dayOfWeek] = {
            id: s.id,
            subjectId: s.subjectId,
            subject: s.subject?.name || null,
            code: s.subject?.code || null,
            teacherId: s.teacherId,
            teacherName: s.teacher?.user?.name || null,
            roomNo: s.roomNo,
        };
    }

    res.json({
        success: true,
        data: {
            section: { id: section.id, name: section.name, classId: section.classId },
            days: WEEKDAYS,
            periods: periods.map((p) => ({
                id: p.id,
                name: p.name,
                startTime: p.startTime,
                endTime: p.endTime,
                isBreak: p.isBreak,
                // Break row me cells nahi bharte
                cells: p.isBreak
                    ? {}
                    : Object.fromEntries(
                          WEEKDAYS.map((d) => [d.value, byKey[p.id + ':' + d.value] || null])
                      ),
            })),
            filled: slots.length,
        },
    });
});

/**
 * Ek slot set karna. Do cheezein check hoti hain:
 *  - us section ke us period par pehle se kuch hai to replace ho jata hai
 *  - wahi teacher us waqt kisi doosri section me to nahi padha raha
 */
export const setSlot = asyncHandler(async (req, res) => {
    const { classId, sectionId, periodId, dayOfWeek, subjectId, teacherId, roomNo } = req.body;

    await assertSameTenant(SchoolClass, req, classId, 'Class');
    const section = await assertSameTenant(Section, req, sectionId, 'Section');
    const period = await assertSameTenant(Period, req, periodId, 'Period');
    const subject = await assertSameTenant(Subject, req, subjectId, 'Subject');
    if (teacherId) await assertSameTenant(Teacher, req, teacherId, 'Teacher');

    if (Number(section.classId) !== Number(classId)) {
        throw ApiError.badRequest('Ye section chuni hui class ka nahi hai', [
            { field: 'sectionId', message: 'Class ke hisaab se section chuniye' },
        ]);
    }

    if (period.isBreak) {
        throw ApiError.badRequest('Break period me class nahi lag sakti', [
            { field: 'periodId', message: 'Koi teaching period chuniye' },
        ]);
    }

    // Subject doosri class ka na ho
    if (subject.classId && Number(subject.classId) !== Number(classId)) {
        throw ApiError.badRequest('Ye subject is class ka nahi hai', [
            { field: 'subjectId', message: 'Class ke hisaab se subject chuniye' },
        ]);
    }

    // Teacher clash - ek teacher ek waqt me ek hi jagah ho sakta hai
    if (teacherId) {
        const clash = await TimetableSlot.findOne({
            where: scopedWhere(req, {
                teacherId,
                dayOfWeek,
                periodId,
                sectionId: { [Op.ne]: sectionId },
            }),
            include: [
                { model: SchoolClass, as: 'schoolClass', attributes: ['name'] },
                { model: Section, as: 'section', attributes: ['name'] },
            ],
        });
        if (clash) {
            const where =
                (clash.schoolClass?.name || 'kisi class') + ' - ' + (clash.section?.name || '');
            throw ApiError.conflict(
                'Ye teacher us waqt ' + where.trim() + ' me padha rahe hain',
                [{ field: 'teacherId', message: 'Doosra teacher chuniye ya period badliye' }]
            );
        }
    }

    const existing = await TimetableSlot.findOne({
        where: { sectionId, dayOfWeek, periodId },
    });

    let slot;
    if (existing) {
        await existing.update({ subjectId, teacherId: teacherId || null, roomNo: roomNo || null, classId });
        slot = existing;
    } else {
        slot = await TimetableSlot.create({
            schoolId: req.schoolId,
            classId,
            sectionId,
            periodId,
            dayOfWeek,
            subjectId,
            teacherId: teacherId || null,
            roomNo: roomNo || null,
        });
    }

    const full = await TimetableSlot.findByPk(slot.id, { include: slotIncludes });
    res.json({
        success: true,
        message: existing ? 'Slot update ho gaya' : 'Slot set ho gaya',
        data: full,
    });
});

export const removeSlot = asyncHandler(async (req, res) => {
    const slot = await findScoped(TimetableSlot, req, req.params.id);
    await slot.destroy();
    res.json({ success: true, message: 'Slot hata diya gaya' });
});

/* ---------------- Views ---------------- */

/** Ek teacher ka poora hafta - kaunse period me kahan. */
export const teacherSchedule = asyncHandler(async (req, res) => {
    // teacherId na aaye to logged-in user ka apna schedule
    let teacherId = req.query.teacherId;
    if (!teacherId) {
        const own = await Teacher.findOne({ where: scopedWhere(req, { userId: req.user.id }) });
        if (!own) throw ApiError.badRequest('Aapka teacher profile nahi mila - teacherId bhejiye');
        teacherId = own.id;
    } else {
        await assertSameTenant(Teacher, req, teacherId, 'Teacher');
    }

    const slots = await TimetableSlot.findAll({
        where: scopedWhere(req, { teacherId }),
        include: slotIncludes,
    });

    const periods = await Period.findAll({
        where: scopedWhere(req, { isBreak: false }),
        order: [['sortOrder', 'ASC']],
    });

    const byKey = {};
    for (const s of slots) {
        byKey[s.periodId + ':' + s.dayOfWeek] = {
            id: s.id,
            subject: s.subject?.name || null,
            className: s.schoolClass?.name || null,
            sectionName: s.section?.name || null,
            roomNo: s.roomNo,
        };
    }

    res.json({
        success: true,
        data: {
            teacherId: Number(teacherId),
            days: WEEKDAYS,
            periods: periods.map((p) => ({
                id: p.id,
                name: p.name,
                startTime: p.startTime,
                endTime: p.endTime,
                cells: Object.fromEntries(
                    WEEKDAYS.map((d) => [d.value, byKey[p.id + ':' + d.value] || null])
                ),
            })),
            totalPeriods: slots.length,
        },
    });
});

/**
 * "Today's classes" - dashboard ke liye. Teacher ko apni classes dikhti hain,
 * baaki sabko poore school ka aaj ka schedule.
 */
export async function todaySchedule(req, { limit = 8 } = {}) {
    const dow = todayDow();
    if (!dow) return { dayOfWeek: null, label: 'Sunday', slots: [] };

    const where = scopedWhere(req, { dayOfWeek: dow });

    // Teacher hai to sirf uske apne periods
    const own = await Teacher.findOne({ where: scopedWhere(req, { userId: req.user.id }) });
    if (own) where.teacherId = own.id;

    // LIMIT ko sort ke baad lagna chahiye - warna din ke arbitrary slots aate hain,
    // pehle wale nahi. Isliye ordering DB me hi period ke sortOrder par karte hain.
    const slots = await TimetableSlot.findAll({
        where,
        include: slotIncludes,
        order: [
            [{ model: Period, as: 'period' }, 'sortOrder', 'ASC'],
            [{ model: Period, as: 'period' }, 'startTime', 'ASC'],
        ],
        limit,
        subQuery: false,
    });

    const sorted = slots
        .map((s) => ({
            id: s.id,
            periodName: s.period?.name || null,
            startTime: s.period?.startTime || null,
            endTime: s.period?.endTime || null,
            sortOrder: s.period?.sortOrder ?? 99,
            subject: s.subject?.name || null,
            className: s.schoolClass?.name || null,
            sectionName: s.section?.name || null,
            teacherName: s.teacher?.user?.name || null,
            roomNo: s.roomNo,
            classId: s.classId,
            sectionId: s.sectionId,
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder);

    return {
        dayOfWeek: dow,
        label: WEEKDAYS.find((d) => d.value === dow)?.label || null,
        forTeacher: Boolean(own),
        slots: sorted,
    };
}

export const today = asyncHandler(async (req, res) => {
    res.json({ success: true, data: await todaySchedule(req, { limit: 20 }) });
});

/** Mobile app - ek student ki section ka timetable. */
export async function forStudent(req, student) {
    if (!student.sectionId) return { days: WEEKDAYS, periods: [], hasTimetable: false };

    const periods = await Period.findAll({
        where: scopedWhere(req),
        order: [['sortOrder', 'ASC']],
    });

    const slots = await TimetableSlot.findAll({
        where: scopedWhere(req, { sectionId: student.sectionId }),
        include: [
            { model: Subject, as: 'subject', attributes: ['name'] },
            {
                model: Teacher,
                as: 'teacher',
                attributes: ['id'],
                include: [{ model: User, as: 'user', attributes: ['name'] }],
            },
        ],
    });

    const byKey = {};
    for (const s of slots) {
        byKey[s.periodId + ':' + s.dayOfWeek] = {
            subject: s.subject?.name || null,
            teacherName: s.teacher?.user?.name || null,
            roomNo: s.roomNo,
        };
    }

    return {
        days: WEEKDAYS,
        todayDow: todayDow(),
        hasTimetable: slots.length > 0,
        periods: periods.map((p) => ({
            id: p.id,
            name: p.name,
            startTime: p.startTime,
            endTime: p.endTime,
            isBreak: p.isBreak,
            cells: p.isBreak
                ? {}
                : Object.fromEntries(
                      WEEKDAYS.map((d) => [d.value, byKey[p.id + ':' + d.value] || null])
                  ),
        })),
    };
}
