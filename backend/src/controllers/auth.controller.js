import { z } from 'zod';
import { Op } from 'sequelize';
import {
    User,
    Role,
    Permission,
    School,
    Teacher,
    Student,
    SchoolClass,
    Section,
} from '../models/index.js';
import { signToken } from '../middleware/auth.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logEvent } from '../services/audit.js';

export const loginSchema = z.object({
    email: z
        .string()
        .email('Valid email daaliye')
        .transform((v) => v.trim().toLowerCase()),
    password: z.string().min(1, 'Password required'),
    // Agar ek hi email do schools me hai to school code se pehchante hain
    schoolCode: z.string().trim().optional(),
});

export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, 'Current password required'),
        newPassword: z.string().min(6, 'New password kam se kam 6 character ka ho'),
    })
    .refine((d) => d.currentPassword !== d.newPassword, {
        message: 'New password purane se alag hona chahiye',
        path: ['newPassword'],
    });

const roleInclude = {
    model: Role,
    as: 'role',
    include: [{ model: Permission, as: 'permissions', through: { attributes: [] } }],
};

/** Login ke baad user ko uska profile bhi chahiye hota hai. */
async function profileFor(user) {
    const slug = user.role?.slug;

    if (slug === 'teacher' || (await Teacher.count({ where: { userId: user.id } }))) {
        const teacher = await Teacher.findOne({ where: { userId: user.id } });
        if (teacher) return { type: 'teacher', data: teacher };
    }

    const student = await Student.findOne({
        where: { userId: user.id },
        include: [
            { model: SchoolClass, as: 'schoolClass', attributes: ['id', 'name'] },
            { model: Section, as: 'section', attributes: ['id', 'name'] },
        ],
    });
    if (student) return { type: 'student', data: student };

    if (slug === 'parent') {
        const children = await Student.findAll({
            include: [
                { model: User, as: 'guardians', where: { id: user.id }, attributes: [], through: { attributes: [] } },
                { model: SchoolClass, as: 'schoolClass', attributes: ['id', 'name'] },
                { model: Section, as: 'section', attributes: ['id', 'name'] },
            ],
        });
        return { type: 'parent', data: { children } };
    }

    return null;
}

/**
 * Super admin ka apna school nahi hota - wo X-School-Id se kisi school me "ghusta" hai.
 * Us case me session me wahi school dikhna chahiye, warna UI ko pata hi nahi chalega
 * ki wo abhi kis tenant me hai.
 */
function sessionPayload(user, activeSchool) {
    const safe = user.toJSON();
    delete safe.password;
    return {
        user: {
            id: safe.id,
            name: safe.name,
            email: safe.email,
            phone: safe.phone,
            avatar: safe.avatar,
            status: safe.status,
            schoolId: safe.schoolId,
            role: user.role
                ? { id: user.role.id, name: user.role.name, slug: user.role.slug, scope: user.role.scope }
                : null,
        },
        school: (activeSchool || user.school)
            ? (() => {
                  const s = activeSchool || user.school;
                  return {
                      id: s.id,
                      name: s.name,
                      code: s.code,
                      logo: s.logo,
                      session: s.session,
                      status: s.status,
                      // Super admin jab kisi school me hai to UI banner dikha sake
                      impersonated: Boolean(activeSchool) && user.schoolId === null,
                  };
              })()
            : null,
        permissions: (user.role?.permissions || []).map((p) => p.slug),
    };
}

export const login = asyncHandler(async (req, res) => {
    const { email, password, schoolCode } = req.body;

    const where = { email };
    if (schoolCode) {
        const school = await School.findOne({ where: { code: schoolCode.toUpperCase() } });
        if (!school) throw ApiError.unauthorized('School code galat hai');
        where.schoolId = school.id;
    }

    // Ek email do alag schools me ho sakta hai - isliye findAll
    const matches = await User.scope('withPassword').findAll({
        where,
        include: [roleInclude, { model: School, as: 'school' }],
    });

    if (matches.length === 0) throw ApiError.unauthorized('Email ya password galat hai');

    // Password se hi decide karte hain ki kaunsa account hai
    const candidates = [];
    for (const u of matches) {
        if (await u.verifyPassword(password)) candidates.push(u);
    }
    if (candidates.length === 0) {
        // Kisi ke account par galat password - us school ke log me (IP ke saath)
        for (const u of matches) {
            logEvent({ action: 'auth.login_failed', module: 'Auth', entity: 'user', entityId: u.id, schoolId: u.schoolId, user: u, summary: 'Galat password se login ki koshish - ' + u.email });
        }
        throw ApiError.unauthorized('Email ya password galat hai');
    }

    if (candidates.length > 1) {
        // Frontend school picker dikha kar dubara schoolCode ke saath bhejega
        return res.status(300).json({
            success: false,
            message: 'Ye email ek se zyada school me hai - apna school chuniye',
            needsSchoolChoice: true,
            data: {
                schools: candidates
                    .filter((u) => u.school)
                    .map((u) => ({ id: u.school.id, name: u.school.name, code: u.school.code })),
            },
        });
    }

    const user = candidates[0];
    if (user.status !== 'active') throw ApiError.forbidden('Aapka account inactive hai');
    if (user.school && user.school.status === 'suspended') {
        throw ApiError.forbidden('Aapke school ka account suspend hai');
    }

    await user.update({ lastLoginAt: new Date() });
    logEvent({ action: 'auth.login', module: 'Auth', entity: 'user', entityId: user.id, schoolId: user.schoolId, user, summary: 'Login - ' + user.name + ' (' + (user.role?.name || '') + ')' });

    res.json({
        success: true,
        message: 'Login successful',
        data: {
            token: signToken(user),
            ...sessionPayload(user),
            profile: await profileFor(user),
        },
    });
});

export const me = asyncHandler(async (req, res) => {
    res.json({
        success: true,
        data: { ...sessionPayload(req.user, req.school), profile: await profileFor(req.user) },
    });
});

export const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.scope('withPassword').findByPk(req.user.id);
    if (!(await user.verifyPassword(currentPassword))) {
        throw ApiError.badRequest('Current password galat hai');
    }

    user.password = newPassword;
    await user.save();

    // Baaki devices ke purane token ab band - is device ko naya token
    res.json({ success: true, message: 'Password update ho gaya', data: { token: signToken(user) } });
});

/** Login screen par school dropdown ke liye - public endpoint. */
export const publicSchools = asyncHandler(async (_req, res) => {
    const schools = await School.findAll({
        where: { status: { [Op.ne]: 'suspended' } },
        attributes: ['id', 'name', 'code'],
        order: [['name', 'ASC']],
    });
    res.json({ success: true, data: schools });
});
