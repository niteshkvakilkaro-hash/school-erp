import { z } from 'zod';
import { Op, literal } from 'sequelize';
import { SchoolClass, Section, Subject, Student, Teacher, User } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginated } from '../utils/pagination.js';
import { scopedWhere, findScoped, assertSameTenant } from '../utils/tenant.js';

const optionalId = z.coerce.number().int().positive().nullable().optional();

export const classCreateSchema = z.object({
    name: z.string().trim().min(1, 'Class name required').max(60),
    level: z.coerce.number().int().min(0).max(100).default(0),
    classTeacherId: optionalId,
    description: z.string().trim().max(255).optional().or(z.literal('')),
    status: z.enum(['active', 'inactive']).default('active'),
});
export const classUpdateSchema = classCreateSchema.partial();

export const listQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().trim().optional(),
    status: z.enum(['active', 'inactive']).optional(),
});

const teacherInclude = {
    model: Teacher,
    as: 'classTeacher',
    attributes: ['id', 'employeeNo'],
    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
};

const studentCountLiteral = [
    literal(
        '(SELECT COUNT(*) FROM students s WHERE s.class_id = SchoolClass.id AND s.status = "active")'
    ),
    'studentCount',
];

export const list = asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const where = scopedWhere(req);
    if (req.query.status) where.status = req.query.status;
    if (req.query.search) where.name = { [Op.like]: '%' + req.query.search + '%' };

    // hasMany include ko yahan join nahi karte: subQuery:false ke saath LIMIT
    // joined rows par lagta hai, isliye 2 sections wali class 2 rows kha jaati hai.
    // Sections alag query se laakar attach karte hain.
    const { rows, count } = await SchoolClass.findAndCountAll({
        where,
        attributes: { include: [studentCountLiteral] },
        include: [teacherInclude],
        order: [
            ['level', 'ASC'],
            ['name', 'ASC'],
        ],
        limit,
        offset,
        distinct: true,
        subQuery: false,
    });

    const sections = await Section.findAll({
        where: { classId: rows.map((r) => r.id) },
        attributes: ['id', 'name', 'classId'],
        order: [['name', 'ASC']],
    });
    const byClass = {};
    for (const s of sections) (byClass[s.classId] ||= []).push({ id: s.id, name: s.name });

    res.json({
        success: true,
        data: paginated({
            rows: rows.map((r) => ({ ...r.toJSON(), sections: byClass[r.id] || [] })),
            count,
            page,
            limit,
        }),
    });
});

/** Dropdowns ke liye - bina pagination ke poori list. */
export const options = asyncHandler(async (req, res) => {
    const classes = await SchoolClass.findAll({
        where: scopedWhere(req, { status: 'active' }),
        attributes: ['id', 'name', 'level'],
        include: [{ model: Section, as: 'sections', attributes: ['id', 'name'] }],
        order: [
            ['level', 'ASC'],
            ['name', 'ASC'],
        ],
    });
    res.json({ success: true, data: classes });
});

export const getOne = asyncHandler(async (req, res) => {
    const item = await findScoped(SchoolClass, req, req.params.id, {
        attributes: { include: [studentCountLiteral] },
        include: [
            teacherInclude,
            { model: Section, as: 'sections' },
            { model: Subject, as: 'subjects' },
        ],
    });
    res.json({ success: true, data: item });
});

export const create = asyncHandler(async (req, res) => {
    await assertSameTenant(Teacher, req, req.body.classTeacherId, 'Teacher');
    const item = await SchoolClass.create({ ...req.body, schoolId: req.schoolId });
    res.status(201).json({ success: true, message: 'Class created', data: item });
});

export const update = asyncHandler(async (req, res) => {
    const item = await findScoped(SchoolClass, req, req.params.id);
    await assertSameTenant(Teacher, req, req.body.classTeacherId, 'Teacher');
    await item.update(req.body);
    res.json({ success: true, message: 'Class updated', data: item });
});

export const remove = asyncHandler(async (req, res) => {
    const item = await findScoped(SchoolClass, req, req.params.id);

    const studentCount = await Student.count({ where: { classId: item.id } });
    if (studentCount > 0) {
        throw ApiError.conflict(
            'Is class me ' + studentCount + ' student hain - pehle unhe move ya delete kijiye'
        );
    }

    await item.destroy();
    res.json({ success: true, message: 'Class deleted' });
});
