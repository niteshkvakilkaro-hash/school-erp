import fs from 'node:fs';
import { z } from 'zod';
import { Op } from 'sequelize';
import {
    sequelize, HrSetting, StaffAttendance, LeaveRequest, User, Role, Teacher, Section, SchoolClass,
} from '../models/index.js';
import { STAFF_STATUSES } from '../models/StaffAttendance.js';
import { LEAVE_TYPES } from '../models/LeaveRequest.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { scopedWhere, findScoped, assertSameTenant } from '../utils/tenant.js';
import { savePrivateImage, privatePath } from '../utils/upload.js';
import { localDate, localTime, toMinutes, weekday, distanceM, eachDay } from '../utils/clock.js';
import { notify } from '../services/notify.js';

export { LEAVE_TYPES };

/* ---------------- Shared ---------------- */

export async function settingsFor(schoolId) {
    const [s] = await HrSetting.findOrCreate({ where: { schoolId }, defaults: { schoolId } });
    return s;
}

const offDays = (s) =>
    String(s.weeklyOff || '')
        .split(',')
        .filter((x) => x !== '')
        .map(Number);

/** Staff = school ke wo users jo student/parent nahi hain. */
export async function staffUsers(req) {
    return User.findAll({
        where: scopedWhere(req, { status: 'active' }),
        attributes: ['id', 'name', 'email', 'phone'],
        include: [{ model: Role, as: 'role', attributes: ['id', 'name', 'slug'], where: { slug: { [Op.notIn]: ['student', 'parent'] } } }],
        order: [['name', 'ASC']],
    });
}

/** Leave ke din - weekly off chhod kar. */
function leaveDays(from, to, off) {
    return eachDay(from, to).filter((d) => !off.includes(weekday(d))).length;
}

/** Approved leave jo is date ko cover karti hai. */
const approvedLeaveOn = (req, userIds, date) =>
    LeaveRequest.findAll({
        where: scopedWhere(req, { userId: userIds, status: 'approved', fromDate: { [Op.lte]: date }, toDate: { [Op.gte]: date } }),
    });

/** Record ko API ke liye - photo ka private key bahar nahi, sirf hai/nahi. */
function shapeRecord(r) {
    if (!r) return null;
    const j = r.toJSON();
    return {
        ...j,
        inPhoto: undefined,
        outPhoto: undefined,
        hasInPhoto: Boolean(j.inPhoto),
        hasOutPhoto: Boolean(j.outPhoto),
        inTime: j.inAt ? localTime(new Date(j.inAt)) : null,
        outTime: j.outAt ? localTime(new Date(j.outAt)) : null,
    };
}

const num = (v) => (v === undefined || v === null || v === '' ? null : Number(v));

/** multipart fields se location nikalta hai aur check karta hai. */
function readPoint(body, settings) {
    const lat = num(body.latitude);
    const lng = num(body.longitude);
    const accuracy = num(body.accuracy);
    const has = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
    if (!has) {
        if (settings.requireLocation) throw ApiError.badRequest('Location chahiye - phone me GPS on karke dobara try kijiye');
        return { lat: null, lng: null, accuracy: null, distance: null, outside: false, mocked: false };
    }
    const mocked = body.mocked === 'true' || body.mocked === true;
    let distance = null;
    let outside = false;
    if (settings.latitude !== null && settings.longitude !== null) {
        distance = distanceM(lat, lng, Number(settings.latitude), Number(settings.longitude));
        // GPS ki galti ka thoda fayda (max 100m), taaki gate par khade ko bahar na maane
        outside = distance - Math.min(accuracy || 0, 100) > settings.radiusM;
    }
    if (settings.blockOutside && (outside || mocked)) {
        throw ApiError.forbidden(
            mocked
                ? 'Nakli (mock) location pakdi gayi - asli GPS se try kijiye'
                : 'Aap school se ' + distance + ' m door hain - campus ke andar se hi attendance lagegi'
        );
    }
    return { lat, lng, accuracy: accuracy === null ? null : Math.round(accuracy), distance, outside, mocked };
}

/* ---------------- Staff: apni attendance (app) ---------------- */

export const me = asyncHandler(async (req, res) => {
    const s = await settingsFor(req.schoolId);
    const today = localDate();
    const [record, teacher, onLeave, month] = await Promise.all([
        StaffAttendance.findOne({ where: scopedWhere(req, { userId: req.user.id, date: today }) }),
        Teacher.findOne({ where: scopedWhere(req, { userId: req.user.id }), attributes: ['id'] }),
        approvedLeaveOn(req, [req.user.id], today),
        StaffAttendance.findAll({
            where: scopedWhere(req, { userId: req.user.id, date: { [Op.gte]: today.slice(0, 8) + '01' } }),
            attributes: ['status'],
        }),
    ]);
    // Teacher jin sections ka class teacher hai - app me seedha attendance ke liye
    const sections = teacher
        ? await Section.findAll({
              where: scopedWhere(req, { teacherId: teacher.id }),
              attributes: ['id', 'name', 'classId'],
              include: [{ model: SchoolClass, as: 'schoolClass', attributes: ['id', 'name'] }],
          })
        : [];
    const counts = Object.fromEntries(STAFF_STATUSES.map((k) => [k, 0]));
    for (const r of month) counts[r.status]++;

    res.json({
        success: true,
        data: {
            today,
            now: localTime(),
            isOffDay: offDays(s).includes(weekday(today)),
            onLeave: onLeave[0] ? { type: onLeave[0].type, from: onLeave[0].fromDate, to: onLeave[0].toDate } : null,
            record: shapeRecord(record),
            policy: {
                officeStart: s.officeStart,
                officeEnd: s.officeEnd,
                graceMinutes: s.graceMinutes,
                radiusM: s.radiusM,
                requireSelfie: s.requireSelfie,
                requireLocation: s.requireLocation,
                blockOutside: s.blockOutside,
                school: s.latitude !== null ? { latitude: Number(s.latitude), longitude: Number(s.longitude) } : null,
            },
            month: counts,
            isTeacher: Boolean(teacher),
            sections: sections.map((x) => ({ id: x.id, name: x.name, classId: x.classId, className: x.schoolClass?.name })),
        },
    });
});

export const checkIn = asyncHandler(async (req, res) => {
    const s = await settingsFor(req.schoolId);
    const today = localDate();

    const leave = await approvedLeaveOn(req, [req.user.id], today);
    if (leave.length) throw ApiError.conflict('Aaj aapki chhutti approved hai - check-in ki zaroorat nahi');
    if (s.requireSelfie && !req.file) throw ApiError.badRequest('Selfie chahiye - camera se photo lijiye');

    const p = readPoint(req.body, s);
    const now = new Date();
    const late = toMinutes(localTime(now)) > toMinutes(s.officeStart) + s.graceMinutes;

    const existing = await StaffAttendance.findOne({ where: scopedWhere(req, { userId: req.user.id, date: today }) });
    if (existing?.inAt) throw ApiError.conflict('Aaj ka check-in pehle hi ho chuka hai');

    const photo = req.file ? await savePrivateImage(req.file.buffer, req.schoolId, 'attendance') : null;
    const values = {
        status: late ? 'late' : 'present',
        inAt: now,
        inLat: p.lat,
        inLng: p.lng,
        inAccuracy: p.accuracy,
        inDistance: p.distance,
        inOutside: p.outside,
        inMocked: p.mocked,
        inPhoto: photo,
        source: 'app',
    };
    let record;
    try {
        // Admin ne pehle haath se mark kiya tha (e.g. absent) - asli check-in use badal deta hai
        record = existing
            ? await existing.update(values)
            : await StaffAttendance.create({ schoolId: req.schoolId, userId: req.user.id, date: today, ...values });
    } catch (err) {
        if (photo) fs.promises.unlink(privatePath(photo)).catch(() => {});
        // Unique (user, date) - do baar tap ya do phone
        if (err.name === 'SequelizeUniqueConstraintError') throw ApiError.conflict('Aaj ka check-in pehle hi ho chuka hai');
        throw err;
    }

    const msg = (late ? 'Check-in ho gaya (late) - ' : 'Check-in ho gaya - ') + localTime(now) + (p.outside ? ' | campus ke bahar se' : '');
    res.status(201).json({ success: true, message: msg, data: shapeRecord(record) });
});

export const checkOut = asyncHandler(async (req, res) => {
    const s = await settingsFor(req.schoolId);
    const today = localDate();
    const p = readPoint(req.body, s);

    const out = await sequelize.transaction(async (t) => {
        const r = await StaffAttendance.findOne({
            where: scopedWhere(req, { userId: req.user.id, date: today }),
            lock: t.LOCK.UPDATE,
            transaction: t,
        });
        if (!r || !r.inAt) throw ApiError.badRequest('Pehle check-in kijiye');
        if (r.outAt) throw ApiError.conflict('Aaj ka check-out pehle hi ho chuka hai');

        const now = new Date();
        const work = Math.max(0, Math.round((now - new Date(r.inAt)) / 60000));
        const photo = req.file ? await savePrivateImage(req.file.buffer, req.schoolId, 'attendance') : null;
        await r.update(
            {
                outAt: now,
                outLat: p.lat,
                outLng: p.lng,
                outAccuracy: p.accuracy,
                outDistance: p.distance,
                outOutside: p.outside,
                outMocked: p.mocked,
                outPhoto: photo,
                workMinutes: work,
                // Kam ghante = half-day
                status: work < s.halfDayMinutes ? 'half-day' : r.status,
            },
            { transaction: t }
        );
        return r;
    });

    const h = Math.floor(out.workMinutes / 60);
    res.json({
        success: true,
        message: 'Check-out ho gaya - ' + h + 'h ' + (out.workMinutes % 60) + 'm' + (out.status === 'half-day' ? ' (half-day)' : ''),
        data: shapeRecord(out),
    });
});

export const monthQuerySchema = z.object({
    month: z
        .string()
        .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month YYYY-MM format me')
        .optional(),
});

const monthRange = (month) => {
    const m = month || localDate().slice(0, 7);
    const [y, mm] = m.split('-').map(Number);
    const last = new Date(Date.UTC(y, mm, 0)).getUTCDate();
    return { month: m, from: m + '-01', to: m + '-' + String(last).padStart(2, '0') };
};

export const myAttendance = asyncHandler(async (req, res) => {
    const { month, from, to } = monthRange(req.query.month);
    const s = await settingsFor(req.schoolId);
    const [rows, leaves] = await Promise.all([
        StaffAttendance.findAll({ where: scopedWhere(req, { userId: req.user.id, date: { [Op.between]: [from, to] } }), order: [['date', 'DESC']] }),
        LeaveRequest.findAll({ where: scopedWhere(req, { userId: req.user.id, status: 'approved', fromDate: { [Op.lte]: to }, toDate: { [Op.gte]: from } }) }),
    ]);
    const byDate = Object.fromEntries(rows.map((r) => [r.date, r]));
    const today = localDate();
    const off = offDays(s);
    const days = eachDay(from, to)
        .filter((d) => d <= today)
        .reverse()
        .map((d) => {
            const r = byDate[d];
            const leave = leaves.find((l) => l.fromDate <= d && l.toDate >= d);
            const status = r ? r.status : leave ? 'leave' : off.includes(weekday(d)) ? 'off' : d === today ? 'pending' : 'absent';
            return { date: d, status, record: shapeRecord(r) };
        });
    const totals = {};
    for (const d of days) totals[d.status] = (totals[d.status] || 0) + 1;
    res.json({ success: true, data: { month, days, totals } });
});

/* ---------------- Staff: leave ---------------- */

export const leaveSchema = z
    .object({
        type: z.enum(LEAVE_TYPES).default('casual'),
        fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date chuniye'),
        toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date chuniye'),
        reason: z.string().trim().min(3, 'Reason likhiye').max(500),
    })
    .refine((v) => v.toDate >= v.fromDate, { message: 'To date, from date ke baad honi chahiye', path: ['toDate'] });

export const myLeaves = asyncHandler(async (req, res) => {
    const rows = await LeaveRequest.findAll({
        where: scopedWhere(req, { userId: req.user.id }),
        include: [{ model: User, as: 'reviewedBy', attributes: ['id', 'name'] }],
        order: [['fromDate', 'DESC'], ['id', 'DESC']],
        limit: 50,
    });
    const year = localDate().slice(0, 4);
    const used = {};
    for (const l of rows) if (l.status === 'approved' && l.fromDate.startsWith(year)) used[l.type] = (used[l.type] || 0) + l.days;
    res.json({ success: true, data: { items: rows, usedThisYear: used } });
});

export const applyLeave = asyncHandler(async (req, res) => {
    const { type, fromDate, toDate, reason } = req.body;
    const today = localDate();
    // Beeti tareekh ki sick leave 7 din tak chal jaati hai, baaki sirf aaj/aage ki
    const minFrom = type === 'sick' ? new Date(Date.parse(today + 'T12:00:00Z') - 7 * 86400000).toISOString().slice(0, 10) : today;
    if (fromDate < minFrom) {
        throw ApiError.badRequest(type === 'sick' ? 'Sick leave 7 din se purani nahi' : 'Beeti tareekh ki leave nahi', [{ field: 'fromDate', message: 'Date check kijiye' }]);
    }
    if (eachDay(fromDate, toDate).length > 60) throw ApiError.badRequest('Ek baar me 60 din se zyada ki leave nahi');

    const s = await settingsFor(req.schoolId);
    const days = leaveDays(fromDate, toDate, offDays(s));
    if (!days) throw ApiError.badRequest('In dino me sab chhutti (weekly off) hai');

    const clash = await LeaveRequest.findOne({
        where: scopedWhere(req, {
            userId: req.user.id,
            status: ['pending', 'approved'],
            fromDate: { [Op.lte]: toDate },
            toDate: { [Op.gte]: fromDate },
        }),
    });
    if (clash) throw ApiError.conflict('In dino ki leave pehle se ' + clash.status + ' hai (' + clash.fromDate + ' se ' + clash.toDate + ')');

    const leave = await LeaveRequest.create({ schoolId: req.schoolId, userId: req.user.id, type, fromDate, toDate, days, reason });
    res.status(201).json({ success: true, message: days + ' din ki leave apply ho gayi', data: leave });
});

export const cancelLeave = asyncHandler(async (req, res) => {
    const l = await findScoped(LeaveRequest, req, req.params.id);
    if (l.userId !== req.user.id) throw ApiError.notFound('Leave not found');
    // Approved leave shuru hone se pehle hi cancel
    if (!(l.status === 'pending' || (l.status === 'approved' && l.fromDate > localDate()))) {
        throw ApiError.badRequest('Ye leave ab cancel nahi ho sakti');
    }
    await l.update({ status: 'cancelled' });
    res.json({ success: true, message: 'Leave cancel ho gayi', data: l });
});

/* ---------------- Admin: live panel ---------------- */

export const dateQuerySchema = z.object({
    date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
});

/**
 * Aaj (ya kisi din) ka live haal - har staff ka check-in/out, selfie, doori,
 * late / bahar se / nakli location ke flags. Admin panel har 30 sec refresh karta hai.
 */
export const live = asyncHandler(async (req, res) => {
    const date = req.query.date || localDate();
    const s = await settingsFor(req.schoolId);
    const staff = await staffUsers(req);
    const ids = staff.map((u) => u.id);
    const [records, leaves] = await Promise.all([
        StaffAttendance.findAll({ where: scopedWhere(req, { date, userId: ids }) }),
        approvedLeaveOn(req, ids, date),
    ]);
    const byUser = Object.fromEntries(records.map((r) => [r.userId, r]));
    const leaveBy = Object.fromEntries(leaves.map((l) => [l.userId, l]));

    const today = localDate();
    const dayOver = date < today || (date === today && toMinutes(localTime()) > toMinutes(s.officeEnd));
    const isOff = offDays(s).includes(weekday(date));

    const counts = { total: staff.length, present: 0, late: 0, 'half-day': 0, absent: 0, leave: 0, notYet: 0, outside: 0, mocked: 0, checkedOut: 0 };
    const rows = staff.map((u) => {
        const r = byUser[u.id];
        let state;
        if (r) state = r.status;
        else if (leaveBy[u.id]) state = 'leave';
        else if (isOff) state = 'off';
        else state = dayOver ? 'absent' : 'not-yet';

        if (state === 'not-yet') counts.notYet++;
        else if (counts[state] !== undefined) counts[state]++;
        if (r?.inOutside) counts.outside++;
        if (r?.inMocked || r?.outMocked) counts.mocked++;
        if (r?.outAt) counts.checkedOut++;

        return {
            user: { id: u.id, name: u.name, phone: u.phone, role: u.role?.name },
            state,
            record: shapeRecord(r),
            leave: leaveBy[u.id] ? { type: leaveBy[u.id].type, from: leaveBy[u.id].fromDate, to: leaveBy[u.id].toDate } : null,
        };
    });

    // Pehle jo aaye (naye upar), phir baaki
    const order = { late: 0, present: 0, 'half-day': 0, 'not-yet': 1, absent: 2, leave: 3, off: 4 };
    rows.sort((a, b) => order[a.state] - order[b.state] || String(b.record?.inAt || '').localeCompare(String(a.record?.inAt || '')) || a.user.name.localeCompare(b.user.name));

    res.json({
        success: true,
        data: {
            date,
            today,
            now: localTime(),
            isOffDay: isOff,
            policy: { officeStart: s.officeStart, officeEnd: s.officeEnd, graceMinutes: s.graceMinutes, radiusM: s.radiusM, school: s.latitude !== null ? { latitude: Number(s.latitude), longitude: Number(s.longitude) } : null },
            counts,
            rows,
        },
    });
});

/** Mahine ka register - staff x din, har khane me status code. */
export const register = asyncHandler(async (req, res) => {
    const { month, from, to } = monthRange(req.query.month);
    const s = await settingsFor(req.schoolId);
    const staff = await staffUsers(req);
    const ids = staff.map((u) => u.id);
    const [records, leaves] = await Promise.all([
        StaffAttendance.findAll({ where: scopedWhere(req, { userId: ids, date: { [Op.between]: [from, to] } }), attributes: ['userId', 'date', 'status', 'source'] }),
        LeaveRequest.findAll({ where: scopedWhere(req, { userId: ids, status: 'approved', fromDate: { [Op.lte]: to }, toDate: { [Op.gte]: from } }) }),
    ]);
    const today = localDate();
    const off = offDays(s);
    const days = eachDay(from, to).map((d) => ({ date: d, day: Number(d.slice(8)), off: off.includes(weekday(d)) }));
    const key = (u, d) => u + ':' + d;
    const rec = Object.fromEntries(records.map((r) => [key(r.userId, r.date), r]));

    const rows = staff.map((u) => {
        const totals = { present: 0, late: 0, 'half-day': 0, absent: 0, leave: 0 };
        const cells = days.map(({ date, off: isOff }) => {
            const r = rec[key(u.id, date)];
            let st = null;
            if (r) st = r.status;
            else if (leaves.some((l) => l.userId === u.id && l.fromDate <= date && l.toDate >= date)) st = 'leave';
            else if (isOff) st = 'off';
            else if (date < today) st = 'absent';
            if (st && totals[st] !== undefined) totals[st]++;
            return st ? { s: st, m: r?.source === 'manual' } : null;
        });
        // Present + late + aadha half-day = kaam ke din
        const worked = totals.present + totals.late + totals['half-day'] / 2;
        return { user: { id: u.id, name: u.name, role: u.role?.name }, cells, totals, worked };
    });
    res.json({ success: true, data: { month, days, rows } });
});

export const manualSchema = z.object({
    userId: z.coerce.number().int().positive(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date chuniye'),
    status: z.enum(STAFF_STATUSES),
    note: z.string().trim().min(3, 'Kyun badla - note likhiye').max(255),
});

/** Admin ka haath se mark/sudhar - check-in ka data (selfie, location) rehta hai, sirf status badalta hai. */
export const manualMark = asyncHandler(async (req, res) => {
    const { userId, date, status, note } = req.body;
    if (date > localDate()) throw ApiError.badRequest('Aage ki date ki attendance nahi lag sakti');
    const user = await assertSameTenant(User, req, userId, 'Staff');
    const role = await Role.findByPk(user.roleId, { attributes: ['slug'] });
    if (['student', 'parent'].includes(role?.slug)) throw ApiError.badRequest('Ye staff member nahi hai');

    const [row, created] = await StaffAttendance.findOrCreate({
        where: { userId, date },
        defaults: { schoolId: req.schoolId, userId, date, status, source: 'manual', note, markedById: req.user.id },
    });
    if (!created) await row.update({ status, note, markedById: req.user.id, source: row.inAt ? row.source : 'manual' });
    res.json({ success: true, message: user.name + ' - ' + date + ': ' + status, data: shapeRecord(row) });
});

/** Selfie - sirf HR dekhne wala ya khud wo staff. */
export const photo = asyncHandler(async (req, res) => {
    const r = await findScoped(StaffAttendance, req, req.params.id);
    const own = r.userId === req.user.id;
    if (!own && !req.permissions.has('hr.view')) throw ApiError.forbidden();
    const key = req.params.which === 'out' ? r.outPhoto : r.inPhoto;
    const abs = privatePath(key);
    if (!abs || !fs.existsSync(abs)) throw ApiError.notFound('Photo nahi hai');
    res.set('Cache-Control', 'private, max-age=3600');
    res.type('image/webp');
    fs.createReadStream(abs).pipe(res);
});

/* ---------------- Admin: leaves ---------------- */

export const leaveQuerySchema = z.object({
    status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
});

export const listLeaves = asyncHandler(async (req, res) => {
    const where = scopedWhere(req);
    if (req.query.status) where.status = req.query.status;
    const rows = await LeaveRequest.findAll({
        where,
        include: [
            { model: User, as: 'user', attributes: ['id', 'name'], include: [{ model: Role, as: 'role', attributes: ['name'] }] },
            { model: User, as: 'reviewedBy', attributes: ['id', 'name'] },
        ],
        order: [[sequelize.literal("`LeaveRequest`.`status` = 'pending'"), 'DESC'], ['fromDate', 'DESC'], ['id', 'DESC']],
        limit: 200,
    });
    const pending = await LeaveRequest.count({ where: scopedWhere(req, { status: 'pending' }) });
    res.json({ success: true, data: { items: rows, pending } });
});

export const reviewSchema = z.object({
    status: z.enum(['approved', 'rejected']),
    note: z.string().trim().max(255).optional(),
});

export const reviewLeave = asyncHandler(async (req, res) => {
    const { status, note } = req.body;
    if (status === 'rejected' && !note) throw ApiError.badRequest('Reject karne ka reason likhiye', [{ field: 'note', message: 'Reason zaroori' }]);
    const l = await sequelize.transaction(async (t) => {
        const row = await LeaveRequest.findOne({ where: scopedWhere(req, { id: req.params.id }), lock: t.LOCK.UPDATE, transaction: t });
        if (!row) throw ApiError.notFound('Leave not found');
        if (row.status !== 'pending') throw ApiError.conflict('Ye leave pehle hi ' + row.status + ' hai');
        if (row.userId === req.user.id) throw ApiError.forbidden('Apni leave khud approve nahi kar sakte');
        await row.update({ status, reviewNote: note || null, reviewedById: req.user.id, reviewedAt: new Date() }, { transaction: t });
        return row;
    });
    const staff = await User.findByPk(l.userId, { attributes: ['id', 'name', 'phone'] });
    if (staff) {
        notify(req.schoolId, 'leaveDecision', [
            {
                phone: staff.phone,
                userId: staff.id,
                vars: { name: staff.name, dates: l.fromDate === l.toDate ? l.fromDate : l.fromDate + ' - ' + l.toDate, status: status === 'approved' ? 'approve' : 'reject' },
                dedupeKey: 'leave:' + l.id,
            },
        ]);
    }
    res.json({ success: true, message: 'Leave ' + status, data: l });
});

/* ---------------- Admin: settings ---------------- */

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
export const settingsSchema = z
    .object({
        latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
        longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
        radiusM: z.coerce.number().int().min(30, 'Kam se kam 30 m').max(5000).optional(),
        officeStart: z.string().regex(HHMM, 'HH:MM').optional(),
        officeEnd: z.string().regex(HHMM, 'HH:MM').optional(),
        graceMinutes: z.coerce.number().int().min(0).max(180).optional(),
        halfDayMinutes: z.coerce.number().int().min(30).max(720).optional(),
        requireSelfie: z.boolean().optional(),
        requireLocation: z.boolean().optional(),
        blockOutside: z.boolean().optional(),
        weeklyOff: z.array(z.number().int().min(0).max(6)).max(3).optional(),
    })
    .refine((v) => !v.officeStart || !v.officeEnd || v.officeEnd > v.officeStart, { message: 'Chhutti ka time aane ke baad hona chahiye', path: ['officeEnd'] })
    .refine((v) => (v.latitude === undefined) === (v.longitude === undefined), { message: 'Latitude aur longitude dono chahiye', path: ['longitude'] });

export const getSettings = asyncHandler(async (req, res) => {
    const s = await settingsFor(req.schoolId);
    res.json({ success: true, data: { ...s.toJSON(), weeklyOff: offDays(s) } });
});

export const updateSettings = asyncHandler(async (req, res) => {
    const s = await settingsFor(req.schoolId);
    const patch = { ...req.body };
    if (patch.weeklyOff) patch.weeklyOff = [...new Set(patch.weeklyOff)].sort().join(',');
    if (patch.blockOutside && (patch.latitude ?? s.latitude) === null) {
        throw ApiError.badRequest('Bahar se rokne ke liye pehle school ki location set kijiye', [{ field: 'latitude', message: 'Location chahiye' }]);
    }
    await s.update(patch);
    res.json({ success: true, message: 'HR settings save ho gayi', data: { ...s.toJSON(), weeklyOff: offDays(s) } });
});
