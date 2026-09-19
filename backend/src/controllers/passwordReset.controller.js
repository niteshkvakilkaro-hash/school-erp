import crypto from 'node:crypto';
import { z } from 'zod';
import { Op } from 'sequelize';
import { sequelize, User, School, Student, PasswordReset } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { safeEqual } from '../utils/secrets.js';
import { isProd } from '../config/env.js';
import { msgSettingsFor, notify, normalizePhone } from '../services/notify.js';
import { setAuditActor } from '../utils/auditContext.js';
import { logEvent } from '../services/audit.js';

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_REQUESTS = 3; // ek user ke liye 15 minute me

const hashOtp = (ref, otp) => crypto.createHash('sha256').update(ref + ':' + otp).digest('hex');
const maskPhone = (p) => '******' + p.slice(-4);

const email = z
    .string()
    .email('Valid email daaliye')
    .transform((v) => v.trim().toLowerCase());
const otp = z.string().trim().regex(/^\d{6}$/, '6 digit OTP daaliye');
const ref = z.string().regex(/^[a-f0-9]{48}$/, 'Request galat hai - dobara OTP mangiye');

export const requestSchema = z.object({ email, schoolCode: z.string().trim().max(30).optional() });
export const verifySchema = z.object({ ref, otp });
export const resetSchema = z.object({ ref, otp, newPassword: z.string().min(6, 'Password kam se kam 6 character ka ho').max(100) });

/** OTP kis number par jaye - user ka apna, warna student ho to guardian ka. */
async function phoneFor(user) {
    if (normalizePhone(user.phone)) return normalizePhone(user.phone);
    const s = await Student.findOne({ where: { userId: user.id }, attributes: ['guardianPhone'] });
    return normalizePhone(s?.guardianPhone);
}

/** Step 1: email (+ school) -> registered mobile par OTP */
export const requestOtp = asyncHandler(async (req, res) => {
    const where = { email: req.body.email };
    if (req.body.schoolCode) {
        const school = await School.findOne({ where: { code: req.body.schoolCode.toUpperCase() }, attributes: ['id'] });
        if (!school) throw ApiError.badRequest('School code galat hai');
        where.schoolId = school.id;
    }
    const matches = await User.findAll({ where, include: [{ model: School, as: 'school', attributes: ['id', 'status'] }] });
    if (!matches.length) throw ApiError.notFound('Is email ka koi account nahi mila');
    // Ek email kai schools me - kaunsa school, ye user batayega (list yahan nahi dete)
    if (matches.length > 1) {
        return res.status(300).json({ success: false, needsSchoolChoice: true, message: 'Ye email ek se zyada school me hai - apna school chuniye' });
    }

    const user = matches[0];
    if (user.status !== 'active') throw ApiError.forbidden('Aapka account inactive hai - school se sampark kijiye');
    if (!user.schoolId) throw ApiError.badRequest('Platform admin ka password server se reset hota hai');
    if (user.school?.status === 'suspended') throw ApiError.forbidden('Aapke school ka account suspend hai');

    const phone = await phoneFor(user);
    if (!phone) throw ApiError.badRequest('Aapka mobile number registered nahi hai - school office se password reset karwaiye');
    const ms = await msgSettingsFor(user.schoolId);
    if (ms.provider === 'none') throw ApiError.badRequest('School ne SMS chalu nahi kiya - school office se password reset karwaiye');

    const recent = await PasswordReset.count({ where: { userId: user.id, createdAt: { [Op.gte]: new Date(Date.now() - 15 * 60 * 1000) } } });
    if (recent >= MAX_REQUESTS) throw new ApiError(429, 'Bahut baar OTP manga - 15 minute baad try kijiye');

    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    const r = crypto.randomBytes(24).toString('hex');
    // Naya OTP aate hi purane bekaar
    await PasswordReset.update({ usedAt: new Date() }, { where: { userId: user.id, usedAt: null } });
    await PasswordReset.create({ userId: user.id, schoolId: user.schoolId, ref: r, otpHash: hashOtp(r, code), expiresAt: new Date(Date.now() + OTP_TTL_MS), ip: req.ip });

    const [sent] = await notify(user.schoolId, 'otp', [{ phone, userId: user.id, vars: { otp: code }, logVars: { otp: '******' } }], { wait: true, force: true });
    if (!sent || sent.status !== 'sent') {
        await PasswordReset.update({ usedAt: new Date() }, { where: { ref: r } });
        throw ApiError.badRequest('OTP nahi bhej paaye' + (sent?.error ? ' (' + sent.error + ')' : '') + ' - thodi der baad try kijiye');
    }

    const data = { ref: r, phoneHint: maskPhone(phone), expiresInSec: OTP_TTL_MS / 1000 };
    // Demo me asli SMS nahi jaata - test karne wale ko OTP screen par hi dikha dete hain (production me kabhi nahi)
    if (ms.provider === 'demo' && !isProd) data.demoOtp = code;
    res.json({ success: true, message: 'OTP ' + data.phoneHint + ' par bheja gaya', data });
});

/** OTP check - galat try gine jaate hain. Row lock ke saath taaki parallel guess se limit na tute. */
async function checkOtp(t, refVal, code) {
    const row = await PasswordReset.findOne({ where: { ref: refVal }, lock: t.LOCK.UPDATE, transaction: t });
    if (!row || row.usedAt) return { error: 'Ye OTP ab valid nahi - dobara OTP mangiye' };
    if (row.expiresAt < new Date()) return { error: 'OTP expire ho gaya - dobara mangiye' };
    if (row.attempts >= MAX_ATTEMPTS) return { error: 'Bahut galat try - dobara OTP mangiye' };
    if (!safeEqual(row.otpHash, hashOtp(refVal, code))) {
        await row.update({ attempts: row.attempts + 1 }, { transaction: t });
        const left = MAX_ATTEMPTS - row.attempts;
        return { error: left > 0 ? 'OTP galat hai (' + left + ' try baaki)' : 'Bahut galat try - dobara OTP mangiye', field: true };
    }
    return { row };
}

/** Step 2 (optional, UI ke liye): OTP sahi hai ya nahi - use nahi karta */
export const verifyOtp = asyncHandler(async (req, res) => {
    // Galat try ka count commit hona chahiye, isliye error transaction ke bahar phenkte hain
    const r = await sequelize.transaction((t) => checkOtp(t, req.body.ref, req.body.otp));
    if (r.error) throw ApiError.badRequest(r.error, r.field ? [{ field: 'otp', message: r.error }] : undefined);
    res.json({ success: true, message: 'OTP sahi hai - naya password bana lijiye' });
});

/** Step 3: OTP + naya password. OTP ek hi baar chalta hai; baaki saare login (dusre phone) band. */
export const resetPassword = asyncHandler(async (req, res) => {
    const out = await sequelize.transaction(async (t) => {
        const r = await checkOtp(t, req.body.ref, req.body.otp);
        if (r.error) return r;
        const user = await User.scope('withPassword').findByPk(r.row.userId, { transaction: t, lock: t.LOCK.UPDATE });
        if (!user || user.status !== 'active') return { error: 'Account active nahi hai' };
        if (await user.verifyPassword(req.body.newPassword)) return { error: 'Naya password purane se alag rakhiye', pwd: true };
        setAuditActor(user, user.schoolId);
        user.password = req.body.newPassword;
        await user.save({ transaction: t });
        logEvent({ action: 'auth.password_reset', module: 'Auth', entity: 'user', entityId: user.id, schoolId: user.schoolId, user, summary: 'OTP se password reset - ' + user.email, transaction: t });
        await r.row.update({ usedAt: new Date() }, { transaction: t });
        await PasswordReset.update({ usedAt: new Date() }, { where: { userId: user.id, usedAt: null }, transaction: t });
        return { ok: true };
    });
    if (out.error) {
        const field = out.pwd ? 'newPassword' : out.field ? 'otp' : null;
        throw ApiError.badRequest(out.error, field ? [{ field, message: out.error }] : undefined);
    }
    res.json({ success: true, message: 'Password badal gaya - ab naye password se login kijiye' });
});
