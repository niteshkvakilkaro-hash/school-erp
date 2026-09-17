import { z } from 'zod';
import { Op } from 'sequelize';
import { sequelize, Student, User, SchoolClass, Section, Role } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginated } from '../utils/pagination.js';
import { scopedWhere, findScoped, assertSameTenant } from '../utils/tenant.js';

const emptyToNull = (v) => (v === '' || v === undefined ? null : v);

/** Dropdown khaali chhodne par Zod ka raw enum message na dikhe - null maan lo. */
const optionalEnum = (values, message) =>
    z
        .preprocess(
            (v) => (v === '' || v === null || v === undefined ? null : v),
            z.enum(values, { errorMap: () => ({ message }) }).nullable()
        )
        .optional();
const optionalDate = z
    .preprocess((v) => (v === '' || v === null || v === undefined ? null : v), z.coerce.date().nullable())
    .optional();
const optionalFk = z
    .preprocess(
        (v) => (v === '' || v === null || v === undefined ? null : v),
        z.coerce.number().int().positive().nullable()
    )
    .optional();

export const studentCreateSchema = z.object({
    admissionNo: z.string().trim().min(1, 'Admission number required').max(30),
    firstName: z.string().trim().min(1, 'First name required').max(60),
    lastName: z.string().trim().max(60).optional().transform(emptyToNull),
    gender: optionalEnum(['male', 'female', 'other'], 'Valid gender chuniye'),
    dob: optionalDate,
    bloodGroup: z.string().trim().max(5).optional().transform(emptyToNull),
    classId: optionalFk,
    sectionId: optionalFk,
    rollNo: z.string().trim().max(20).optional().transform(emptyToNull),
    fatherName: z.string().trim().max(120).optional().transform(emptyToNull),
    motherName: z.string().trim().max(120).optional().transform(emptyToNull),
    guardianPhone: z.string().trim().max(20).optional().transform(emptyToNull),
    guardianEmail: z
        .union([z.string().trim().toLowerCase().email('Valid guardian email daaliye'), z.literal('')])
        .optional()
        .transform(emptyToNull),
    address: z.string().trim().max(255).optional().transform(emptyToNull),
    city: z.string().trim().max(80).optional().transform(emptyToNull),
    admissionDate: optionalDate,
    status: z.enum(['active', 'inactive', 'alumni']).default('active'),

    // Optional login account - createLogin true hone par hi banega
    createLogin: z.coerce.boolean().default(false),
    email: z
        .union([z.string().trim().toLowerCase().email('Valid login email daaliye'), z.literal('')])
        .optional()
        .transform(emptyToNull),
    password: z.union([z.string().min(6, 'Password kam se kam 6 character ka ho'), z.literal('')])
        .optional()
        .transform(emptyToNull),
});

export const studentUpdateSchema = studentCreateSchema.partial();

export const studentQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().trim().optional(),
    classId: z.coerce.number().int().positive().optional(),
    sectionId: z.coerce.number().int().positive().optional(),
    status: z.enum(['active', 'inactive', 'alumni']).optional(),
    sort: z.enum(['newest', 'oldest', 'name', 'roll']).default('newest'),
});

const includes = [
    { model: SchoolClass, as: 'schoolClass', attributes: ['id', 'name', 'level'] },
    { model: Section, as: 'section', attributes: ['id', 'name'] },
    { model: User, as: 'user', attributes: ['id', 'name', 'email', 'status', 'lastLoginAt'] },
];

const ORDER = {
    newest: [['createdAt', 'DESC']],
    oldest: [['createdAt', 'ASC']],
    name: [['firstName', 'ASC']],
    roll: [['rollNo', 'ASC']],
};

/** Section aur class ka rishta valid hai ya nahi - warna data corrupt ho jata hai. */
async function assertSectionBelongsToClass(req, classId, sectionId) {
    if (!sectionId) return;
    const section = await assertSameTenant(Section, req, sectionId, 'Section');
    if (classId && Number(section.classId) !== Number(classId)) {
        throw ApiError.badRequest('Ye section chuni hui class ka nahi hai', [
            { field: 'sectionId', message: 'Class ke hisaab se section chuniye' },
        ]);
    }
}

export const list = asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);

    const where = scopedWhere(req);
    if (req.query.status) where.status = req.query.status;
    if (req.query.classId) where.classId = req.query.classId;
    if (req.query.sectionId) where.sectionId = req.query.sectionId;
    if (req.query.search) {
        const q = '%' + req.query.search + '%';
        where[Op.or] = [
            { firstName: { [Op.like]: q } },
            { lastName: { [Op.like]: q } },
            { admissionNo: { [Op.like]: q } },
            { rollNo: { [Op.like]: q } },
            { fatherName: { [Op.like]: q } },
            { guardianPhone: { [Op.like]: q } },
        ];
    }

    const { rows, count } = await Student.findAndCountAll({
        where,
        include: includes,
        order: ORDER[req.query.sort] || ORDER.newest,
        limit,
        offset,
        distinct: true,
        subQuery: false,
    });

    res.json({ success: true, data: paginated({ rows, count, page, limit }) });
});

export const getOne = asyncHandler(async (req, res) => {
    const item = await findScoped(Student, req, req.params.id, { include: includes });
    res.json({ success: true, data: item });
});

/** Agli admission number suggest karta hai - form khulte hi bhar jaata hai. */
export const nextAdmissionNo = asyncHandler(async (req, res) => {
    const year = new Date().getFullYear();
    const prefix = 'ADM' + year + '-';

    const last = await Student.findOne({
        where: scopedWhere(req, { admissionNo: { [Op.like]: prefix + '%' } }),
        order: [['admissionNo', 'DESC']],
        attributes: ['admissionNo'],
    });

    const lastSeq = last ? Number.parseInt(last.admissionNo.slice(prefix.length), 10) || 0 : 0;
    const next = prefix + String(lastSeq + 1).padStart(4, '0');

    res.json({ success: true, data: { admissionNo: next } });
});

/** Student ka portal login banate waqt uska role chahiye. */
async function studentRoleId(req) {
    const role = await Role.findOne({ where: { schoolId: req.schoolId, slug: 'student' } });
    if (!role) throw ApiError.badRequest('Student role is school me set nahi hai');
    return role.id;
}

export const create = asyncHandler(async (req, res) => {
    const { createLogin, email, password, ...profile } = req.body;

    await assertSameTenant(SchoolClass, req, profile.classId, 'Class');
    await assertSectionBelongsToClass(req, profile.classId, profile.sectionId);

    let roleId = null;
    if (createLogin) {
        if (!email || !password) {
            throw ApiError.badRequest('Login banane ke liye email aur password dono chahiye');
        }
        const exists = await User.findOne({ where: { email, schoolId: req.schoolId } });
        if (exists) throw ApiError.conflict('Ye email is school me already registered hai');
        roleId = await studentRoleId(req);
    }

    const student = await sequelize.transaction(async (t) => {
        let userId = null;
        if (createLogin) {
            const user = await User.create(
                {
                    schoolId: req.schoolId,
                    roleId,
                    name: [profile.firstName, profile.lastName].filter(Boolean).join(' '),
                    email,
                    password,
                    phone: profile.guardianPhone,
                    status: profile.status === 'active' ? 'active' : 'inactive',
                },
                { transaction: t }
            );
            userId = user.id;
        }
        return Student.create({ ...profile, schoolId: req.schoolId, userId }, { transaction: t });
    });

    const full = await Student.findByPk(student.id, { include: includes });
    res.status(201).json({ success: true, message: 'Student admitted', data: full });
});

export const update = asyncHandler(async (req, res) => {
    const student = await findScoped(Student, req, req.params.id);

    const { createLogin, email, password, ...profile } = req.body;

    const nextClassId = profile.classId !== undefined ? profile.classId : student.classId;
    const nextSectionId = profile.sectionId !== undefined ? profile.sectionId : student.sectionId;
    await assertSameTenant(SchoolClass, req, nextClassId, 'Class');
    await assertSectionBelongsToClass(req, nextClassId, nextSectionId);

    const roleId = createLogin && !student.userId ? await studentRoleId(req) : null;

    await sequelize.transaction(async (t) => {
        await student.update(profile, { transaction: t });

        if (student.userId) {
            const user = await User.scope('withPassword').findByPk(student.userId, { transaction: t });
            if (user) {
                const patch = {
                    name: [student.firstName, student.lastName].filter(Boolean).join(' '),
                };
                if (email && email !== user.email) {
                    const clash = await User.findOne({
                        where: { email, schoolId: req.schoolId, id: { [Op.ne]: user.id } },
                        transaction: t,
                    });
                    if (clash) throw ApiError.conflict('Ye email kisi aur account par hai');
                    patch.email = email;
                }
                if (password) patch.password = password;
                if (profile.status !== undefined) {
                    patch.status = profile.status === 'active' ? 'active' : 'inactive';
                }
                await user.update(patch, { transaction: t });
            }
        } else if (createLogin && email && password) {
            const exists = await User.findOne({
                where: { email, schoolId: req.schoolId },
                transaction: t,
            });
            if (exists) throw ApiError.conflict('Ye email already registered hai');

            const user = await User.create(
                {
                    schoolId: req.schoolId,
                    roleId,
                    name: [student.firstName, student.lastName].filter(Boolean).join(' '),
                    email,
                    password,
                    phone: student.guardianPhone,
                },
                { transaction: t }
            );
            await student.update({ userId: user.id }, { transaction: t });
        }
    });

    const full = await Student.findByPk(student.id, { include: includes });
    res.json({ success: true, message: 'Student updated', data: full });
});

export const remove = asyncHandler(async (req, res) => {
    const student = await findScoped(Student, req, req.params.id);

    await sequelize.transaction(async (t) => {
        const userId = student.userId;
        await student.destroy({ transaction: t });
        if (userId) await User.destroy({ where: { id: userId }, transaction: t });
    });

    res.json({ success: true, message: 'Student deleted' });
});
