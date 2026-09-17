import { fn, col, literal } from 'sequelize';
import { User, Teacher, Student, SchoolClass, Section, Subject } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { scopedWhere } from '../utils/tenant.js';

export const stats = asyncHandler(async (req, res) => {
    const [students, teachers, classes, sections, subjects, users] = await Promise.all([
        Student.count({ where: scopedWhere(req, { status: 'active' }) }),
        Teacher.count({ where: scopedWhere(req, { status: 'active' }) }),
        SchoolClass.count({ where: scopedWhere(req, { status: 'active' }) }),
        Section.count({ where: scopedWhere(req) }),
        Subject.count({ where: scopedWhere(req) }),
        User.count({ where: scopedWhere(req, { status: 'active' }) }),
    ]);

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

    res.json({
        success: true,
        data: {
            counts: { students, teachers, classes, sections, subjects, users },
            genderSplit: genderSplit.map((g) => ({
                gender: g.gender || 'unspecified',
                count: Number(g.count),
            })),
            byClass: byClass.map((c) => ({ ...c, studentCount: Number(c.studentCount) })),
            recentAdmissions,
        },
    });
});
