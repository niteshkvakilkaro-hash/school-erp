import { z } from 'zod';
import { Op, fn, col, literal } from 'sequelize';
import {
    sequelize,
    School,
    Plan,
    Subscription,
    Role,
    User,
    Student,
    Teacher,
} from '../models/index.js';
import { seedRolesForSchool } from '../services/rbac.service.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginated } from '../utils/pagination.js';

const slugify = (v) =>
    v
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

export const schoolCreateSchema = z.object({
    name: z.string().trim().min(2, 'School name required').max(160),
    code: z
        .string()
        .trim()
        .min(2, 'School code required')
        .max(40)
        .transform((v) => v.toUpperCase().replace(/\s+/g, '-')),
    email: z.union([z.string().trim().toLowerCase().email(), z.literal('')]).optional(),
    phone: z.string().trim().max(20).optional(),
    address: z.string().trim().max(255).optional(),
    city: z.string().trim().max(80).optional(),
    state: z.string().trim().max(80).optional(),
    pincode: z.string().trim().max(10).optional(),
    website: z.string().trim().max(160).optional(),
    session: z.string().trim().max(20).optional(),
    status: z.enum(['active', 'suspended', 'trial']).default('trial'),
    planId: z.coerce.number().int().positive().optional(),

    // Pehla School Admin - school ke saath hi ban jata hai
    adminName: z.string().trim().min(2, 'Admin ka naam chahiye').max(120),
    adminEmail: z.string().trim().toLowerCase().email('Valid admin email daaliye'),
    adminPassword: z.string().min(6, 'Password kam se kam 6 character ka ho'),
});

export const schoolUpdateSchema = schoolCreateSchema
    .omit({ adminName: true, adminEmail: true, adminPassword: true })
    .partial();

export const schoolQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().trim().optional(),
    status: z.enum(['active', 'suspended', 'trial']).optional(),
});

export const planSchema = z.object({
    name: z.string().trim().min(2).max(60),
    code: z.string().trim().min(2).max(30).transform((v) => v.toUpperCase()),
    pricePerMonth: z.coerce.number().min(0).default(0),
    maxStudents: z.coerce.number().int().min(0).default(0),
    maxTeachers: z.coerce.number().int().min(0).default(0),
    features: z.string().trim().max(2000).optional(),
    status: z.enum(['active', 'inactive']).default('active'),
});

export const subscriptionSchema = z.object({
    schoolId: z.coerce.number().int().positive(),
    planId: z.coerce.number().int().positive(),
    startsOn: z.coerce.date(),
    endsOn: z.coerce.date(),
    amount: z.coerce.number().min(0).default(0),
    notes: z.string().trim().max(255).optional(),
});

/* ---------------- Schools ---------------- */

const counts = [
    [
        literal('(SELECT COUNT(*) FROM students s WHERE s.school_id = School.id AND s.status = "active")'),
        'studentCount',
    ],
    [
        literal('(SELECT COUNT(*) FROM teachers t WHERE t.school_id = School.id AND t.status = "active")'),
        'teacherCount',
    ],
];

export const listSchools = asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.search) {
        const q = '%' + req.query.search + '%';
        where[Op.or] = [{ name: { [Op.like]: q } }, { code: { [Op.like]: q } }, { city: { [Op.like]: q } }];
    }

    const { rows, count } = await School.findAndCountAll({
        where,
        attributes: { include: counts },
        include: [
            {
                model: Subscription,
                required: false,
                where: { status: 'active' },
                include: [{ model: Plan, as: 'plan', attributes: ['id', 'name', 'code'] }],
            },
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        distinct: true,
        subQuery: false,
    });

    res.json({ success: true, data: paginated({ rows, count, page, limit }) });
});

export const getSchool = asyncHandler(async (req, res) => {
    const school = await School.findByPk(req.params.id, {
        attributes: { include: counts },
        include: [{ model: Subscription, include: [{ model: Plan, as: 'plan' }] }],
    });
    if (!school) throw ApiError.notFound('School not found');
    res.json({ success: true, data: school });
});

export const createSchool = asyncHandler(async (req, res) => {
    const { adminName, adminEmail, adminPassword, planId, ...schoolData } = req.body;

    const clash = await School.findOne({ where: { code: schoolData.code } });
    if (clash) throw ApiError.conflict('Ye school code already use me hai');

    const school = await sequelize.transaction(async (t) => {
        const created = await School.create(
            { ...schoolData, slug: slugify(schoolData.name + '-' + schoolData.code) },
            { transaction: t }
        );

        // Default roles + pehla admin - school kabhi bina admin ke nahi banta
        const roles = await seedRolesForSchool(created.id, { transaction: t });
        await User.create(
            {
                schoolId: created.id,
                roleId: roles['school-admin'].id,
                name: adminName,
                email: adminEmail,
                password: adminPassword,
                status: 'active',
            },
            { transaction: t }
        );

        if (planId) {
            const plan = await Plan.findByPk(planId, { transaction: t });
            if (!plan) throw ApiError.badRequest('Plan exist nahi karta');

            const startsOn = new Date();
            const endsOn = new Date();
            endsOn.setFullYear(endsOn.getFullYear() + 1);

            await Subscription.create(
                {
                    schoolId: created.id,
                    planId,
                    startsOn,
                    endsOn,
                    amount: Number(plan.pricePerMonth) * 12,
                },
                { transaction: t }
            );
        }

        return created;
    });

    res.status(201).json({
        success: true,
        message: 'School ban gaya - admin login ' + adminEmail + ' se hoga',
        data: school,
    });
});

export const updateSchool = asyncHandler(async (req, res) => {
    const school = await School.findByPk(req.params.id);
    if (!school) throw ApiError.notFound('School not found');
    await school.update(req.body);
    res.json({ success: true, message: 'School updated', data: school });
});

export const removeSchool = asyncHandler(async (req, res) => {
    const school = await School.findByPk(req.params.id);
    if (!school) throw ApiError.notFound('School not found');

    // Cascade se poora tenant data hat jata hai - isliye explicit confirm zaroori
    if (req.query.confirm !== school.code) {
        throw ApiError.badRequest(
            'Delete confirm karne ke liye ?confirm=' + school.code + ' bhejiye. Poora data hat jayega.'
        );
    }

    await school.destroy();
    res.json({ success: true, message: 'School aur uska poora data delete ho gaya' });
});

/* ---------------- Plans & subscriptions ---------------- */

export const listPlans = asyncHandler(async (_req, res) => {
    const plans = await Plan.findAll({ order: [['pricePerMonth', 'ASC']] });
    res.json({ success: true, data: plans });
});

export const createPlan = asyncHandler(async (req, res) => {
    const plan = await Plan.create(req.body);
    res.status(201).json({ success: true, message: 'Plan created', data: plan });
});

export const updatePlan = asyncHandler(async (req, res) => {
    const plan = await Plan.findByPk(req.params.id);
    if (!plan) throw ApiError.notFound('Plan not found');
    await plan.update(req.body);
    res.json({ success: true, message: 'Plan updated', data: plan });
});

export const removePlan = asyncHandler(async (req, res) => {
    const plan = await Plan.findByPk(req.params.id);
    if (!plan) throw ApiError.notFound('Plan not found');

    const inUse = await Subscription.count({ where: { planId: plan.id, status: 'active' } });
    if (inUse > 0) {
        throw ApiError.conflict(inUse + ' schools is plan par hain - pehle unhe shift kijiye');
    }

    await plan.destroy();
    res.json({ success: true, message: 'Plan deleted' });
});

export const createSubscription = asyncHandler(async (req, res) => {
    const school = await School.findByPk(req.body.schoolId);
    if (!school) throw ApiError.badRequest('School exist nahi karta');

    const plan = await Plan.findByPk(req.body.planId);
    if (!plan) throw ApiError.badRequest('Plan exist nahi karta');

    if (new Date(req.body.endsOn) <= new Date(req.body.startsOn)) {
        throw ApiError.badRequest('End date, start date ke baad honi chahiye', [
            { field: 'endsOn', message: 'Start date ke baad ki date chuniye' },
        ]);
    }

    const subscription = await sequelize.transaction(async (t) => {
        // Purani active subscription band karo - ek time par ek hi active rehni chahiye
        await Subscription.update(
            { status: 'expired' },
            { where: { schoolId: school.id, status: 'active' }, transaction: t }
        );
        return Subscription.create(req.body, { transaction: t });
    });

    res.status(201).json({ success: true, message: 'Subscription active', data: subscription });
});

/* ---------------- Platform dashboard ---------------- */

export const platformStats = asyncHandler(async (_req, res) => {
    const [schools, activeSchools, trialSchools, suspended, students, teachers, users] =
        await Promise.all([
            School.count(),
            School.count({ where: { status: 'active' } }),
            School.count({ where: { status: 'trial' } }),
            School.count({ where: { status: 'suspended' } }),
            Student.count({ where: { status: 'active' } }),
            Teacher.count({ where: { status: 'active' } }),
            User.count({ where: { status: 'active' } }),
        ]);

    const bySchool = await School.findAll({
        attributes: ['id', 'name', 'code', 'status', ...counts],
        order: [['createdAt', 'DESC']],
        limit: 8,
        raw: true,
    });

    const revenue = await Subscription.findOne({
        attributes: [[fn('SUM', col('amount')), 'total']],
        where: { status: 'active' },
        raw: true,
    });

    const planSplit = await Subscription.findAll({
        attributes: ['planId', [fn('COUNT', col('Subscription.id')), 'count']],
        where: { status: 'active' },
        include: [{ model: Plan, as: 'plan', attributes: ['name'] }],
        group: ['planId', 'plan.id'],
        raw: true,
        nest: true,
    });

    res.json({
        success: true,
        data: {
            counts: { schools, activeSchools, trialSchools, suspended, students, teachers, users },
            activeRevenue: Number(revenue?.total || 0),
            planSplit: planSplit.map((p) => ({
                plan: p.plan?.name || 'Unknown',
                count: Number(p.count),
            })),
            recentSchools: bySchool.map((s) => ({
                ...s,
                studentCount: Number(s.studentCount),
                teacherCount: Number(s.teacherCount),
            })),
        },
    });
});
