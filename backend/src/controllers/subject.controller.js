import { z } from 'zod';
import { Op } from 'sequelize';
import { Subject, SchoolClass, Teacher, User } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginated } from '../utils/pagination.js';
import { scopedWhere, findScoped, assertSameTenant } from '../utils/tenant.js';

export const subjectCreateSchema = z.object({
    name: z.string().trim().min(1, 'Subject name required').max(100),
    code: z
        .string()
        .trim()
        .min(1, 'Subject code required')
        .max(20)
        .transform((v) => v.toUpperCase()),
    classId: z.coerce.number().int().positive().nullable().optional(),
    teacherId: z.coerce.number().int().positive().nullable().optional(),
    type: z.enum(['theory', 'practical', 'elective']).default('theory'),
    maxMarks: z.coerce.number().int().min(1).max(1000).default(100),
    passMarks: z.coerce.number().int().min(0).max(1000).default(33),
});

export const subjectUpdateSchema = subjectCreateSchema.partial();

export const subjectQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().trim().optional(),
    classId: z.coerce.number().int().positive().optional(),
    teacherId: z.coerce.number().int().positive().optional(),
});


const includes = [
    { model: SchoolClass, as: 'schoolClass', attributes: ['id', 'name', 'level'] },
    {
        model: Teacher,
        as: 'teacher',
        attributes: ['id', 'employeeNo'],
        include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
    },
];

export const list = asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const where = scopedWhere(req);
    if (req.query.classId) where.classId = req.query.classId;
    if (req.query.teacherId) where.teacherId = req.query.teacherId;
    if (req.query.search) {
        const q = '%' + req.query.search + '%';
        where[Op.or] = [{ name: { [Op.like]: q } }, { code: { [Op.like]: q } }];
    }

    const { rows, count } = await Subject.findAndCountAll({
        where,
        include: includes,
        order: [['name', 'ASC']],
        limit,
        offset,
        distinct: true,
    });

    res.json({ success: true, data: paginated({ rows, count, page, limit }) });
});

export const getOne = asyncHandler(async (req, res) => {
    const item = await findScoped(Subject, req, req.params.id, { include: includes });
    res.json({ success: true, data: item });
});

function assertMarks(body, existing = {}) {
    const max = body.maxMarks ?? existing.maxMarks;
    const pass = body.passMarks ?? existing.passMarks;
    if (max != null && pass != null && Number(pass) > Number(max)) {
        throw ApiError.badRequest('Pass marks, max marks se zyada nahi ho sakte', [
            { field: 'passMarks', message: 'Max marks se kam rakhiye' },
        ]);
    }
}

export const create = asyncHandler(async (req, res) => {
    assertMarks(req.body);
    await assertSameTenant(SchoolClass, req, req.body.classId, 'Class');
    await assertSameTenant(Teacher, req, req.body.teacherId, 'Teacher');

    const item = await Subject.create({ ...req.body, schoolId: req.schoolId });
    res.status(201).json({ success: true, message: 'Subject created', data: item });
});

export const update = asyncHandler(async (req, res) => {
    const item = await findScoped(Subject, req, req.params.id);
    assertMarks(req.body, item);
    await assertSameTenant(SchoolClass, req, req.body.classId, 'Class');
    await assertSameTenant(Teacher, req, req.body.teacherId, 'Teacher');

    await item.update(req.body);
    res.json({ success: true, message: 'Subject updated', data: item });
});

export const remove = asyncHandler(async (req, res) => {
    const item = await findScoped(Subject, req, req.params.id);
    await item.destroy();
    res.json({ success: true, message: 'Subject deleted' });
});
