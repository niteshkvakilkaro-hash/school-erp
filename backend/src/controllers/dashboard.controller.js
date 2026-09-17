import { Op, fn, col, literal } from 'sequelize';
import { User, Teacher, Student, SchoolClass, Section, Subject, Role } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { scopedWhere } from '../utils/tenant.js';
import { todaySnapshot } from './attendance.controller.js';

const daysAgo = (n) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - n);
    return d;
};

/**
 * "+12% vs last month" wala number. Pichhle 30 din me bane records ko
 * usse pehle ke 30 din se compare karte hain - koi fake number nahi.
 */
async function growth(Model, req) {
    const [current, previous] = await Promise.all([
        Model.count({ where: scopedWhere(req, { createdAt: { [Op.gte]: daysAgo(30) } }) }),
        Model.count({
            where: scopedWhere(req, {
                createdAt: { [Op.gte]: daysAgo(60), [Op.lt]: daysAgo(30) },
            }),
        }),
    ]);

    // Pehle mahine kuch nahi tha to percent ka matlab nahi banta
    const percent = previous === 0 ? null : Math.round(((current - previous) / previous) * 100);
    return { addedLast30Days: current, previous, percent };
}

/** Pichhle 6 mahine ki admissions - dashboard ka line chart. */
async function admissionsTrend(req) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setMonth(start.getMonth() - 5, 1);

    const rows = await Student.findAll({
        attributes: [
            [fn('DATE_FORMAT', col('created_at'), '%Y-%m'), 'month'],
            [fn('COUNT', col('id')), 'count'],
        ],
        where: scopedWhere(req, { createdAt: { [Op.gte]: start } }),
        group: [literal('month')],
        order: [literal('month ASC')],
        raw: true,
    });

    const map = Object.fromEntries(rows.map((r) => [r.month, Number(r.count)]));

    // Jin mahino me koi admission nahi hui unhe bhi 0 ke saath dikhana hai
    const out = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - i);
        const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        out.push({
            month: key,
            label: d.toLocaleDateString('en-IN', { month: 'short' }),
            count: map[key] || 0,
        });
    }
    return out;
}

/** Naye admissions aur naye teachers ko ek timeline me mila dete hain. */
async function recentActivities(req) {
    const [students, teachers] = await Promise.all([
        Student.findAll({
            attributes: ['id', 'firstName', 'lastName', 'admissionNo', 'createdAt'],
            where: scopedWhere(req),
            include: [{ model: SchoolClass, as: 'schoolClass', attributes: ['name'] }],
            order: [['createdAt', 'DESC']],
            limit: 5,
        }),
        Teacher.findAll({
            attributes: ['id', 'employeeNo', 'specialization', 'createdAt'],
            where: scopedWhere(req),
            include: [{ model: User, as: 'user', attributes: ['name'] }],
            order: [['createdAt', 'DESC']],
            limit: 5,
        }),
    ]);

    const items = [
        ...students.map((s) => ({
            type: 'admission',
            title: 'New admission',
            detail:
                [s.firstName, s.lastName].filter(Boolean).join(' ') +
                (s.schoolClass ? ' (' + s.schoolClass.name + ')' : ''),
            at: s.createdAt,
        })),
        ...teachers.map((t) => ({
            type: 'teacher',
            title: 'Teacher added',
            detail: (t.user?.name || t.employeeNo) + (t.specialization ? ' - ' + t.specialization : ''),
            at: t.createdAt,
        })),
    ];

    return items.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 6);
}

export const stats = asyncHandler(async (req, res) => {
    const [students, teachers, classes, sections, subjects, users, parents] = await Promise.all([
        Student.count({ where: scopedWhere(req, { status: 'active' }) }),
        Teacher.count({ where: scopedWhere(req, { status: 'active' }) }),
        SchoolClass.count({ where: scopedWhere(req, { status: 'active' }) }),
        Section.count({ where: scopedWhere(req) }),
        Subject.count({ where: scopedWhere(req) }),
        User.count({ where: scopedWhere(req, { status: 'active' }) }),
        User.count({
            where: scopedWhere(req, { status: 'active' }),
            include: [{ model: Role, as: 'role', attributes: [], where: { slug: 'parent' } }],
        }),
    ]);

    const [studentGrowth, teacherGrowth] = await Promise.all([growth(Student, req), growth(Teacher, req)]);

    const genderSplit = await Student.findAll({
        attributes: ['gender', [fn('COUNT', col('id')), 'count']],
        where: scopedWhere(req, { status: 'active' }),
        group: ['gender'],
        raw: true,
    });

    const byClass = await SchoolClass.findAll({
        attributes: [
            'id',
            'name',
            'level',
            [
                literal(
                    '(SELECT COUNT(*) FROM students s WHERE s.class_id = SchoolClass.id AND s.status = "active")'
                ),
                'studentCount',
            ],
        ],
        where: scopedWhere(req, { status: 'active' }),
        order: [['level', 'ASC']],
        raw: true,
    });

    const recentAdmissions = await Student.findAll({
        attributes: ['id', 'admissionNo', 'firstName', 'lastName', 'admissionDate', 'rollNo'],
        where: scopedWhere(req),
        include: [
            { model: SchoolClass, as: 'schoolClass', attributes: ['id', 'name'] },
            { model: Section, as: 'section', attributes: ['id', 'name'] },
        ],
        order: [['createdAt', 'DESC']],
        limit: 6,
    });

    // Seat utilisation - kitni seats bhari hain (sections ki capacity ke against)
    const capacityRow = await Section.findOne({
        attributes: [[fn('SUM', col('capacity')), 'total']],
        where: scopedWhere(req),
        raw: true,
    });
    const totalSeats = Number(capacityRow?.total || 0);

    res.json({
        success: true,
        data: {
            counts: { students, teachers, classes, sections, subjects, users, parents },
            growth: { students: studentGrowth, teachers: teacherGrowth },
            seats: {
                total: totalSeats,
                filled: students,
                percent: totalSeats ? Math.round((students / totalSeats) * 100) : 0,
            },
            genderSplit: genderSplit.map((g) => ({
                gender: g.gender || 'unspecified',
                count: Number(g.count),
            })),
            byClass: byClass.map((c) => ({ ...c, studentCount: Number(c.studentCount) })),
            attendanceToday: await todaySnapshot(req),
            admissionsTrend: await admissionsTrend(req),
            recentActivities: await recentActivities(req),
            recentAdmissions,
        },
    });
});
