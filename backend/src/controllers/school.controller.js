import { z } from 'zod';
import { School, Plan, Subscription, Student, Teacher } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** School apni hi profile dekhta/edit karta hai - code aur status platform ke haath me hai. */
export const settingsSchema = z.object({
    name: z.string().trim().min(2, 'School name required').max(160),
    email: z.union([z.string().trim().toLowerCase().email('Valid email daaliye'), z.literal('')]).optional(),
    phone: z.string().trim().max(20).optional(),
    address: z.string().trim().max(255).optional(),
    city: z.string().trim().max(80).optional(),
    state: z.string().trim().max(80).optional(),
    pincode: z.string().trim().max(10).optional(),
    website: z.string().trim().max(160).optional(),
    logo: z.string().trim().max(255).optional(),
    session: z.string().trim().max(20).optional(),
});

export const getSettings = asyncHandler(async (req, res) => {
    const school = await School.findByPk(req.schoolId, {
        include: [
            {
                model: Subscription,
                required: false,
                where: { status: 'active' },
                include: [{ model: Plan, as: 'plan' }],
            },
        ],
    });
    if (!school) throw ApiError.notFound('School not found');

    const [students, teachers] = await Promise.all([
        Student.count({ where: { schoolId: school.id, status: 'active' } }),
        Teacher.count({ where: { schoolId: school.id, status: 'active' } }),
    ]);

    const subscription = school.Subscriptions?.[0] || null;
    const plan = subscription?.plan || null;

    res.json({
        success: true,
        data: {
            school,
            usage: {
                students,
                teachers,
                maxStudents: plan ? Number(plan.maxStudents) : 0,
                maxTeachers: plan ? Number(plan.maxTeachers) : 0,
            },
            subscription,
        },
    });
});

export const updateSettings = asyncHandler(async (req, res) => {
    const school = await School.findByPk(req.schoolId);
    if (!school) throw ApiError.notFound('School not found');

    await school.update(req.body);
    res.json({ success: true, message: 'School settings save ho gayi', data: school });
});
