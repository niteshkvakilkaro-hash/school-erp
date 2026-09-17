import { z } from 'zod';
import { Section, SchoolClass, Student, Teacher, User } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { scopedWhere, findScoped, assertSameTenant } from '../utils/tenant.js';

export const sectionCreateSchema = z.object({
    name: z.string().trim().min(1, 'Section name required').max(20),
    classId: z.coerce.number().int().positive({ message: 'Class choose kijiye' }),
    capacity: z.coerce.number().int().min(1).max(300).default(40),
    teacherId: z.coerce.number().int().positive().nullable().optional(),
    roomNo: z.string().trim().max(20).optional().or(z.literal('')),
});
export const sectionUpdateSchema = sectionCreateSchema.partial();

export const sectionQuerySchema = z.object({
    classId: z.coerce.number().int().positive().optional(),
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
    const where = scopedWhere(req);
    if (req.query.classId) where.classId = req.query.classId;

    const rows = await Section.findAll({
        where,
        include: includes,
        order: [
            [{ model: SchoolClass, as: 'schoolClass' }, 'level', 'ASC'],
            ['name', 'ASC'],
        ],
    });

    // Har section ka active student count ek hi query me nikaal lete hain
    const students = await Student.findAll({
        attributes: ['sectionId'],
        where: scopedWhere(req, { status: 'active' }),
    });
    const tally = {};
    for (const s of students) {
        if (s.sectionId) tally[s.sectionId] = (tally[s.sectionId] || 0) + 1;
    }

    res.json({
        success: true,
        data: rows.map((r) => ({ ...r.toJSON(), studentCount: tally[r.id] || 0 })),
    });
});

export const create = asyncHandler(async (req, res) => {
    await assertSameTenant(SchoolClass, req, req.body.classId, 'Class');
    await assertSameTenant(Teacher, req, req.body.teacherId, 'Teacher');

    const item = await Section.create({ ...req.body, schoolId: req.schoolId });
    res.status(201).json({ success: true, message: 'Section created', data: item });
});

export const update = asyncHandler(async (req, res) => {
    const item = await findScoped(Section, req, req.params.id);
    await assertSameTenant(SchoolClass, req, req.body.classId, 'Class');
    await assertSameTenant(Teacher, req, req.body.teacherId, 'Teacher');

    await item.update(req.body);
    res.json({ success: true, message: 'Section updated', data: item });
});

export const remove = asyncHandler(async (req, res) => {
    const item = await findScoped(Section, req, req.params.id);

    const studentCount = await Student.count({ where: { sectionId: item.id } });
    if (studentCount > 0) {
        throw ApiError.conflict(
            'Is section me ' + studentCount + ' student hain - pehle unhe move kijiye'
        );
    }

    await item.destroy();
    res.json({ success: true, message: 'Section deleted' });
});
