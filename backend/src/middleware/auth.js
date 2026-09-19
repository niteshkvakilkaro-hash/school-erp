import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User, Role, Permission, School } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { setAuditActor } from '../utils/auditContext.js';

export const signToken = (user) =>
    jwt.sign({ id: user.id, schoolId: user.schoolId ?? null, tv: user.tokenVersion || 0 }, env.jwt.secret, {
        expiresIn: env.jwt.expiresIn,
    });

const withRole = {
    model: Role,
    as: 'role',
    include: [{ model: Permission, as: 'permissions', through: { attributes: [] } }],
};

/** Har request par user + uska role + permissions load karte hain. */
export const authenticate = asyncHandler(async (req, _res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
    if (!token) throw ApiError.unauthorized('Login token missing');

    let payload;
    try {
        payload = jwt.verify(token, env.jwt.secret);
    } catch {
        throw ApiError.unauthorized('Session expired, please login again');
    }

    const user = await User.findByPk(payload.id, {
        include: [withRole, { model: School, as: 'school' }],
    });
    if (!user) throw ApiError.unauthorized('Account no longer exists');
    if (user.status !== 'active') throw ApiError.forbidden('Aapka account inactive hai');
    // Password badalne / reset ke baad purane token (dusre phone / browser) band
    if ((payload.tv || 0) !== (user.tokenVersion || 0)) {
        throw ApiError.unauthorized('Password badal gaya hai - dobara login kijiye');
    }

    // Suspended school ka koi bhi member andar nahi aa sakta
    if (user.school && user.school.status === 'suspended') {
        throw ApiError.forbidden('Aapke school ka account suspend hai - platform support se baat kijiye');
    }

    req.user = user;
    req.permissions = new Set((user.role?.permissions || []).map((p) => p.slug));
    req.isPlatformUser = user.schoolId === null;
    setAuditActor(user, user.schoolId);

    next();
});

/**
 * Super admin kisi bhi school ka data dekh sakta hai - wo `X-School-Id` header
 * bhejta hai. Baaki sabke liye schoolId token se aata hai aur badla nahi ja sakta.
 */
export const resolveTenant = asyncHandler(async (req, _res, next) => {
    if (req.isPlatformUser) {
        const headerId = req.headers['x-school-id'];
        if (headerId) {
            const school = await School.findByPk(Number(headerId));
            if (!school) throw ApiError.notFound('School not found');
            req.schoolId = school.id;
            req.school = school;
            setAuditActor(req.user, school.id);
        } else {
            req.schoolId = null;
        }
    } else {
        req.schoolId = req.user.schoolId;
        req.school = req.user.school;
    }
    next();
});

/** School-scoped routes ko chalne ke liye tenant zaroori hai. */
export const requireTenant = (req, _res, next) => {
    if (!req.schoolId) {
        return next(
            ApiError.badRequest(
                'Ye request kisi school se judi honi chahiye. Super admin X-School-Id header bhejein.'
            )
        );
    }
    next();
};

/** can('students.create') - ek bhi permission ho to allow. */
export const can =
    (...slugs) =>
    (req, _res, next) => {
        if (!req.user) return next(ApiError.unauthorized());
        const ok = slugs.some((s) => req.permissions.has(s));
        if (!ok) return next(ApiError.forbidden('Aapke paas is kaam ki permission nahi hai'));
        next();
    };

/** Sirf platform (super admin) routes ke liye. */
export const platformOnly = (req, _res, next) => {
    if (!req.isPlatformUser) return next(ApiError.forbidden('Ye sirf platform admin ke liye hai'));
    next();
};
