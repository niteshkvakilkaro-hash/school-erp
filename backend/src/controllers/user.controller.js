import { z } from 'zod';
import { Op } from 'sequelize';
import { sequelize, User, Role, Student, StudentGuardian, Teacher } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginated } from '../utils/pagination.js';
import { scopedWhere, findScoped, assertSameTenant } from '../utils/tenant.js';

export const userCreateSchema = z.object({
    name: z.string().trim().min(2, 'Naam kam se kam 2 character ka ho').max(120),
    email: z.string().trim().toLowerCase().email('Valid email daaliye'),
    password: z.string().min(6, 'Password kam se kam 6 character ka ho'),
    phone: z.string().trim().max(20).optional(),
    roleId: z.coerce.number().int().positive({ message: 'Role chuniye' }),
    status: z.enum(['active', 'inactive']).default('active'),
    // Parent role ke liye - kaunse bachche isse jude hain
    studentIds: z.array(z.coerce.number().int().positive()).default([]),
});

export const userUpdateSchema = userCreateSchema
    .partial()
    .extend({ password: z.string().min(6, 'Password kam se kam 6 character ka ho').optional() });

export const userQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().trim().optional(),
    roleId: z.coerce.number().int().positive().optional(),
    status: z.enum(['active', 'inactive']).optional(),
});

const includes = [
    { model: Role, as: 'role', attributes: ['id', 'name', 'slug', 'portalOnly'] },
    {
        model: Student,
        as: 'children',
        attributes: ['id', 'admissionNo', 'firstName', 'lastName'],
        through: { attributes: ['relation', 'isPrimary'] },
    },
];

export const list = asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const where = scopedWhere(req);
    if (req.query.status) where.status = req.query.status;
    if (req.query.roleId) where.roleId = req.query.roleId;
    if (req.query.search) {
        const q = '%' + req.query.search + '%';
        where[Op.or] = [{ name: { [Op.like]: q } }, { email: { [Op.like]: q } }, { phone: { [Op.like]: q } }];
    }

    const { rows, count } = await User.findAndCountAll({
        where,
        include: includes,
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        distinct: true,
        subQuery: false,
    });

    res.json({ success: true, data: paginated({ rows, count, page, limit }) });
});

export const getOne = asyncHandler(async (req, res) => {
    const user = await findScoped(User, req, req.params.id, { include: includes });
    res.json({ success: true, data: user });
});

/** Parent ke bachche link karte waqt sab students isi school ke hone chahiye. */
async function linkChildren(user, studentIds, req, transaction) {
    await StudentGuardian.destroy({ where: { userId: user.id }, transaction });
    if (!studentIds?.length) return;

    for (const studentId of studentIds) {
        const student = await Student.findOne({
            where: { id: studentId, schoolId: req.schoolId },
            transaction,
        });
        if (!student) throw ApiError.badRequest('Student #' + studentId + ' aapke school me nahi hai');

        await StudentGuardian.create(
            { schoolId: req.schoolId, userId: user.id, studentId, relation: 'guardian' },
            { transaction }
        );
    }
}

export const create = asyncHandler(async (req, res) => {
    const { studentIds, ...data } = req.body;

    const exists = await User.findOne({ where: { email: data.email, schoolId: req.schoolId } });
    if (exists) throw ApiError.conflict('Ye email is school me already registered hai');

    await assertSameTenant(Role, req, data.roleId, 'Role');

    const user = await sequelize.transaction(async (t) => {
        const created = await User.create({ ...data, schoolId: req.schoolId }, { transaction: t });
        await linkChildren(created, studentIds, req, t);
        return created;
    });

    const full = await User.findByPk(user.id, { include: includes });
    res.status(201).json({ success: true, message: 'User ban gaya', data: full });
});

export const update = asyncHandler(async (req, res) => {
    const user = await findScoped(User, req, req.params.id);
    const { studentIds, ...data } = req.body;

    if (data.email && data.email !== user.email) {
        const clash = await User.findOne({
            where: { email: data.email, schoolId: req.schoolId, id: { [Op.ne]: user.id } },
        });
        if (clash) throw ApiError.conflict('Ye email kisi aur account par hai');
    }

    if (data.roleId) await assertSameTenant(Role, req, data.roleId, 'Role');

    // Apna hi role ya status badal kar khud ko lock out na kar le
    if (user.id === req.user.id) {
        if (data.roleId && Number(data.roleId) !== user.roleId) {
            throw ApiError.badRequest('Aap apna khud ka role nahi badal sakte');
        }
        if (data.status === 'inactive') {
            throw ApiError.badRequest('Aap apna khud ka account inactive nahi kar sakte');
        }
    }

    await sequelize.transaction(async (t) => {
        const patch = { ...data };
        if (!patch.password) delete patch.password;
        await user.update(patch, { transaction: t });

        if (studentIds !== undefined) await linkChildren(user, studentIds, req, t);
    });

    const full = await User.findByPk(user.id, { include: includes });
    res.json({ success: true, message: 'User update ho gaya', data: full });
});

export const remove = asyncHandler(async (req, res) => {
    const user = await findScoped(User, req, req.params.id);

    if (user.id === req.user.id) throw ApiError.badRequest('Aap khud ko delete nahi kar sakte');

    // Teacher/student ka login alag se delete nahi hota - unke apne module se hota hai
    const teacher = await Teacher.findOne({ where: { userId: user.id } });
    if (teacher) {
        throw ApiError.conflict('Ye teacher ka account hai - Teachers module se delete kijiye');
    }
    const student = await Student.findOne({ where: { userId: user.id } });
    if (student) {
        throw ApiError.conflict('Ye student ka account hai - Students module se delete kijiye');
    }

    await user.destroy();
    res.json({ success: true, message: 'User delete ho gaya' });
});
