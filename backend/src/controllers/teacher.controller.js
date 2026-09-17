import { z } from 'zod';
import { Op } from 'sequelize';
import { sequelize, Teacher, User, Subject, Section, SchoolClass, Role } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginated } from '../utils/pagination.js';
import { scopedWhere, findScoped } from '../utils/tenant.js';

const emptyToNull = (v) => (v === '' || v === undefined ? null : v);

/** Dropdown khaali chhodne par Zod ka raw enum message na dikhe - null maan lo. */
const optionalEnum = (values, message) =>
    z
        .preprocess(
            (v) => (v === '' || v === null || v === undefined ? null : v),
            z.enum(values, { errorMap: () => ({ message }) }).nullable()
        )
        .optional();
const optionalDate = z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : v),
    z.coerce.date().nullable()
);

export const teacherCreateSchema = z.object({
    // User account fields
    name: z.string().trim().min(2, 'Naam kam se kam 2 character ka ho').max(120),
    email: z.string().trim().toLowerCase().email('Valid email daaliye'),
    password: z.string().min(6, 'Password kam se kam 6 character ka ho'),
    phone: z.string().trim().max(20).optional().transform(emptyToNull),

    // Teacher profile fields
    employeeNo: z.string().trim().min(1, 'Employee number required').max(30),
    gender: optionalEnum(['male', 'female', 'other'], 'Valid gender chuniye'),
    dob: optionalDate.optional(),
    qualification: z.string().trim().max(120).optional().transform(emptyToNull),
    specialization: z.string().trim().max(120).optional().transform(emptyToNull),
    experienceYears: z.coerce.number().int().min(0).max(60).default(0),
    joiningDate: optionalDate.optional(),
    salary: z.preprocess(
        (v) => (v === '' || v === null || v === undefined ? null : v),
        z.coerce.number().min(0).nullable()
    ).optional(),
    address: z.string().trim().max(255).optional().transform(emptyToNull),
    city: z.string().trim().max(80).optional().transform(emptyToNull),
    status: z.enum(['active', 'inactive']).default('active'),
});

// Update par password optional hota hai (blank chhoda to change nahi hoga)
export const teacherUpdateSchema = teacherCreateSchema
    .partial()
    .extend({ password: z.string().min(6, 'Password kam se kam 6 character ka ho').optional() });

export const teacherQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().trim().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    sort: z.enum(['newest', 'oldest', 'name']).default('newest'),
});

const userInclude = {
    model: User,
    as: 'user',
    attributes: ['id', 'name', 'email', 'phone', 'status', 'avatar', 'lastLoginAt'],
};

const ORDER = {
    newest: [['createdAt', 'DESC']],
    oldest: [['createdAt', 'ASC']],
    name: [[{ model: User, as: 'user' }, 'name', 'ASC']],
};

export const list = asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const where = scopedWhere(req);
    if (req.query.status) where.status = req.query.status;

    if (req.query.search) {
        const q = '%' + req.query.search + '%';
        where[Op.or] = [
            { employeeNo: { [Op.like]: q } },
            { specialization: { [Op.like]: q } },
            { '$user.name$': { [Op.like]: q } },
            { '$user.email$': { [Op.like]: q } },
        ];
    }

    const { rows, count } = await Teacher.findAndCountAll({
        where,
        include: [userInclude],
        order: ORDER[req.query.sort] || ORDER.newest,
        limit,
        offset,
        distinct: true,
        subQuery: false,
    });

    res.json({ success: true, data: paginated({ rows, count, page, limit }) });
});

/** Dropdowns ke liye light-weight list. */
export const options = asyncHandler(async (req, res) => {
    const rows = await Teacher.findAll({
        where: scopedWhere(req, { status: 'active' }),
        attributes: ['id', 'employeeNo'],
        include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
        order: [[{ model: User, as: 'user' }, 'name', 'ASC']],
    });
    res.json({ success: true, data: rows });
});

export const getOne = asyncHandler(async (req, res) => {
    const item = await findScoped(Teacher, req, req.params.id, {
        include: [
            userInclude,
            { model: Subject, as: 'subjects', attributes: ['id', 'name', 'code'] },
            {
                model: Section,
                as: 'sections',
                attributes: ['id', 'name'],
                include: [{ model: SchoolClass, as: 'schoolClass', attributes: ['id', 'name'] }],
            },
        ],
    });
    res.json({ success: true, data: item });
});

/** Teacher ka login account banane ke liye us school ka teacher role chahiye. */
async function teacherRoleId(req) {
    const role = await Role.findOne({ where: { schoolId: req.schoolId, slug: 'teacher' } });
    if (!role) throw ApiError.badRequest('Teacher role is school me set nahi hai');
    return role.id;
}

export const create = asyncHandler(async (req, res) => {
    const { name, email, password, phone, ...profile } = req.body;

    const exists = await User.findOne({ where: { email, schoolId: req.schoolId } });
    if (exists) throw ApiError.conflict('Ye email is school me already registered hai');

    const roleId = await teacherRoleId(req);

    const teacher = await sequelize.transaction(async (t) => {
        const user = await User.create(
            {
                schoolId: req.schoolId,
                roleId,
                name,
                email,
                password,
                phone,
                status: profile.status || 'active',
            },
            { transaction: t }
        );
        return Teacher.create(
            { ...profile, schoolId: req.schoolId, userId: user.id },
            { transaction: t }
        );
    });

    const full = await Teacher.findByPk(teacher.id, { include: [userInclude] });
    res.status(201).json({ success: true, message: 'Teacher added', data: full });
});

export const update = asyncHandler(async (req, res) => {
    const teacher = await findScoped(Teacher, req, req.params.id, { include: [userInclude] });

    const { name, email, password, phone, ...profile } = req.body;

    if (email && email !== teacher.user.email) {
        const clash = await User.findOne({
            where: { email, schoolId: req.schoolId, id: { [Op.ne]: teacher.userId } },
        });
        if (clash) throw ApiError.conflict('Ye email kisi aur account par hai');
    }

    await sequelize.transaction(async (t) => {
        const user = await User.scope('withPassword').findByPk(teacher.userId, { transaction: t });
        const userPatch = {};
        if (name !== undefined) userPatch.name = name;
        if (email !== undefined) userPatch.email = email;
        if (phone !== undefined) userPatch.phone = phone;
        if (password) userPatch.password = password;
        if (profile.status !== undefined) userPatch.status = profile.status;
        if (Object.keys(userPatch).length) await user.update(userPatch, { transaction: t });

        await teacher.update(profile, { transaction: t });
    });

    const full = await Teacher.findByPk(teacher.id, { include: [userInclude] });
    res.json({ success: true, message: 'Teacher updated', data: full });
});

export const remove = asyncHandler(async (req, res) => {
    const teacher = await findScoped(Teacher, req, req.params.id);

    // Assigned subjects/sections ko orphan mat karo - pehle unassign kar dete hain
    await sequelize.transaction(async (t) => {
        const opts = { transaction: t };
        await Subject.update({ teacherId: null }, { where: { teacherId: teacher.id }, ...opts });
        await Section.update({ teacherId: null }, { where: { teacherId: teacher.id }, ...opts });
        await SchoolClass.update(
            { classTeacherId: null },
            { where: { classTeacherId: teacher.id }, ...opts }
        );

        const userId = teacher.userId;
        await teacher.destroy(opts);
        await User.destroy({ where: { id: userId }, ...opts });
    });

    res.json({ success: true, message: 'Teacher deleted' });
});
