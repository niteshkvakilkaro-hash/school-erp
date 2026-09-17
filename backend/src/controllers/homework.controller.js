import { z } from 'zod';
import { Op } from 'sequelize';
import { Homework, SchoolClass, Section, Subject, Teacher, User } from '../models/index.js';
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

export const createSchema = z
    .object({
        title: z.string().trim().min(2, 'Title chahiye').max(160),
        description: z.string().trim().max(4000).optional(),
        classId: z.coerce.number().int().positive({ message: 'Class chuniye' }),
        sectionId: optionalFk,
        subjectId: z.coerce.number().int().positive({ message: 'Subject chuniye' }),
        teacherId: optionalFk,
        assignedDate: dateStr,
        dueDate: dateStr,
        attachmentUrl: z.string().trim().max(255).optional(),
        status: z.enum(['open', 'closed']).default('open'),
    })
    .refine((d) => d.dueDate >= d.assignedDate, {
        message: 'Due date, assigned date se pehle nahi ho sakti',
        path: ['dueDate'],
    });

// .refine wale schema par .partial() nahi chalta - update ke liye alag object
export const updateSchema = z.object({
    title: z.string().trim().min(2, 'Title chahiye').max(160).optional(),
    description: z.string().trim().max(4000).optional(),
    classId: z.coerce.number().int().positive().optional(),
    sectionId: optionalFk,
    subjectId: z.coerce.number().int().positive().optional(),
    teacherId: optionalFk,
    assignedDate: dateStr.optional(),
    dueDate: dateStr.optional(),
    attachmentUrl: z.string().trim().max(255).optional(),
    status: z.enum(['open', 'closed']).optional(),
});

export const querySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().trim().optional(),
    classId: z.coerce.number().int().positive().optional(),
    sectionId: z.coerce.number().int().positive().optional(),
    subjectId: z.coerce.number().int().positive().optional(),
    status: z.enum(['open', 'closed']).optional(),
    due: z.enum(['upcoming', 'overdue']).optional(),
});

const includes = [
    { model: SchoolClass, as: 'schoolClass', attributes: ['id', 'name', 'level'] },
    { model: Section, as: 'section', attributes: ['id', 'name'] },
    { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
    {
        model: Teacher,
        as: 'teacher',
        attributes: ['id', 'employeeNo'],
        include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
    },
];

const today = () => new Date().toISOString().slice(0, 10);

/** Dono taraf ke foreign keys apne school ke hain ya nahi. */
async function assertLinks(req, body) {
    if (body.classId) await assertSameTenant(SchoolClass, req, body.classId, 'Class');
    if (body.subjectId) await assertSameTenant(Subject, req, body.subjectId, 'Subject');
    if (body.teacherId) await assertSameTenant(Teacher, req, body.teacherId, 'Teacher');

    if (body.sectionId) {
        const section = await assertSameTenant(Section, req, body.sectionId, 'Section');
        if (body.classId && Number(section.classId) !== Number(body.classId)) {
            throw ApiError.badRequest('Ye section chuni hui class ka nahi hai', [
                { field: 'sectionId', message: 'Class ke hisaab se section chuniye' },
            ]);
        }
    }
}

export const list = asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);

    const where = scopedWhere(req);
    if (req.query.classId) where.classId = req.query.classId;
    if (req.query.sectionId) where.sectionId = req.query.sectionId;
    if (req.query.subjectId) where.subjectId = req.query.subjectId;
    if (req.query.status) where.status = req.query.status;
    if (req.query.due === 'upcoming') where.dueDate = { [Op.gte]: today() };
    if (req.query.due === 'overdue') where.dueDate = { [Op.lt]: today() };
    if (req.query.search) {
        const q = '%' + req.query.search + '%';
        where[Op.or] = [{ title: { [Op.like]: q } }, { description: { [Op.like]: q } }];
    }

    const { rows, count } = await Homework.findAndCountAll({
        where,
        include: includes,
        order: [
            ['dueDate', 'DESC'],
            ['id', 'DESC'],
        ],
        limit,
        offset,
        distinct: true,
        subQuery: false,
    });

    res.json({ success: true, data: paginated({ rows, count, page, limit }) });
});

export const getOne = asyncHandler(async (req, res) => {
    const item = await findScoped(Homework, req, req.params.id, { include: includes });
    res.json({ success: true, data: item });
});

export const create = asyncHandler(async (req, res) => {
    await assertLinks(req, req.body);

    const item = await Homework.create({ ...req.body, schoolId: req.schoolId });
    const full = await Homework.findByPk(item.id, { include: includes });
    res.status(201).json({ success: true, message: 'Homework assign ho gaya', data: full });
});

export const update = asyncHandler(async (req, res) => {
    const item = await findScoped(Homework, req, req.params.id);
    await assertLinks(req, req.body);

    const assignedDate = req.body.assignedDate ?? item.assignedDate;
    const dueDate = req.body.dueDate ?? item.dueDate;
    if (dueDate < assignedDate) {
        throw ApiError.badRequest('Due date, assigned date se pehle nahi ho sakti', [
            { field: 'dueDate', message: 'Assigned date ke baad ki date chuniye' },
        ]);
    }

    await item.update(req.body);
    const full = await Homework.findByPk(item.id, { include: includes });
    res.json({ success: true, message: 'Homework update ho gaya', data: full });
});

export const remove = asyncHandler(async (req, res) => {
    const item = await findScoped(Homework, req, req.params.id);
    await item.destroy();
    res.json({ success: true, message: 'Homework delete ho gaya' });
});

/** Mobile app ke liye - ek student ki class/section ka homework. */
export async function forStudent(req, student, { limit = 20 } = {}) {
    if (!student.classId) return [];

    const rows = await Homework.findAll({
        where: scopedWhere(req, {
            classId: student.classId,
            // Section-specific homework sirf usi section ko, baaki poori class ko
            [Op.or]: [{ sectionId: null }, { sectionId: student.sectionId }],
        }),
        include: [
            { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
            {
                model: Teacher,
                as: 'teacher',
                attributes: ['id'],
                include: [{ model: User, as: 'user', attributes: ['name'] }],
            },
        ],
        order: [['dueDate', 'DESC']],
        limit,
    });

    return rows.map((h) => ({
        id: h.id,
        title: h.title,
        description: h.description,
        subject: h.subject?.name || null,
        teacherName: h.teacher?.user?.name || null,
        assignedDate: h.assignedDate,
        dueDate: h.dueDate,
        status: h.status,
        isOverdue: h.status === 'open' && h.dueDate < today(),
    }));
}
