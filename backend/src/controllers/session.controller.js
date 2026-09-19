import { z } from 'zod';
import { Op, literal } from 'sequelize';
import { sequelize, School, Student, SchoolClass, Section, StudentFee, PromotionRun, StudentEnrollment, User } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logEvent } from '../services/audit.js';

const UNDO_DAYS = 30;

/** "2026-27" -> "2027-28"; galat format ho to null */
export function nextSession(s) {
    const m = String(s || '').match(/^(\d{4})-(\d{2})$/);
    if (!m) return null;
    const y = Number(m[1]) + 1;
    return y + '-' + String((y + 1) % 100).padStart(2, '0');
}
const validSession = (s) => {
    const m = String(s).match(/^(\d{4})-(\d{2})$/);
    return Boolean(m) && Number(m[2]) === (Number(m[1]) + 1) % 100;
};

async function loadClasses(schoolId, t) {
    return SchoolClass.findAll({
        where: { schoolId },
        include: [{ model: Section, as: 'sections', attributes: ['id', 'name', 'classId'] }],
        order: [['level', 'ASC'], ['name', 'ASC'], [{ model: Section, as: 'sections' }, 'name', 'ASC']],
        transaction: t,
    });
}

const latestRun = (schoolId, t) =>
    PromotionRun.findOne({ where: { schoolId, undoneAt: null }, order: [['id', 'DESC']], transaction: t, lock: t ? t.LOCK.UPDATE : undefined });

const canUndo = (run) => Boolean(run && !run.undoneAt && Date.now() - new Date(run.createdAt).getTime() < UNDO_DAYS * 86400000);

/** Promotion screen ka poora data - kuch badalta nahi. */
export const plan = asyncHandler(async (req, res) => {
    const schoolId = req.schoolId;
    const school = await School.findByPk(schoolId, { attributes: ['id', 'session'] });
    const classes = await loadClasses(schoolId);
    const students = await Student.findAll({
        where: { schoolId, status: 'active', classId: { [Op.ne]: null } },
        attributes: ['id', 'admissionNo', 'firstName', 'lastName', 'rollNo', 'classId', 'sectionId'],
        order: [['firstName', 'ASC']],
    });
    const dues = await StudentFee.findAll({
        attributes: ['studentId', [literal('SUM(amount - discount - paid_amount)'), 'due']],
        where: { schoolId, status: ['pending', 'partial'] },
        group: ['studentId'],
        raw: true,
    });
    const dueBy = new Map(dues.map((d) => [d.studentId, Math.max(0, Math.round(Number(d.due) * 100) / 100)]));
    const noClass = await Student.count({ where: { schoolId, status: 'active', classId: null } });
    const counts = new Map();
    for (const s of students) counts.set(s.classId, (counts.get(s.classId) || 0) + 1);

    const run = await latestRun(schoolId);
    res.json({
        success: true,
        data: {
            currentSession: school.session,
            nextSession: nextSession(school.session),
            classes: classes.map((c, i) => ({
                id: c.id,
                name: c.name,
                level: c.level,
                sections: c.sections.map((s) => ({ id: s.id, name: s.name })),
                students: counts.get(c.id) || 0,
                // Default: level ke hisaab se agli class; sabse upar wali = pass out
                defaultTo: classes[i + 1]?.id ?? null,
            })),
            students: students.map((s) => ({
                id: s.id,
                name: [s.firstName, s.lastName].filter(Boolean).join(' '),
                admissionNo: s.admissionNo,
                rollNo: s.rollNo,
                classId: s.classId,
                sectionId: s.sectionId,
                due: dueBy.get(s.id) || 0,
            })),
            noClass,
            lastRun: run ? { id: run.id, fromSession: run.fromSession, toSession: run.toSession, createdAt: run.createdAt, canUndo: canUndo(run) } : null,
        },
    });
});

const id = z.coerce.number().int().positive();
export const runSchema = z.object({
    toSession: z.string().trim().refine(validSession, 'Session "2027-28" jaisa likhiye'),
    confirm: z.string().trim(),
    classMap: z.array(z.object({ fromClassId: id, toClassId: id.nullable() })).max(200),
    sectionMap: z.array(z.object({ fromSectionId: id, toSectionId: id.nullable() })).max(1000).default([]),
    overrides: z
        .array(z.object({ studentId: id, outcome: z.enum(['promoted', 'detained', 'graduated', 'left']), toSectionId: id.nullable().optional() }))
        .max(5000)
        .default([]),
    resetRollNos: z.boolean().default(false),
});

/**
 * Naya session: har active student ka snapshot, phir class / section / status badlo -
 * sab ek transaction me. Attendance, marks, fees ki purani entries jaisi ki taisi rehti hain.
 */
export const runPromotion = asyncHandler(async (req, res) => {
    const { toSession, confirm, classMap, sectionMap, overrides, resetRollNos } = req.body;
    if (confirm !== toSession) throw ApiError.badRequest('Pakka karne ke liye naya session (' + toSession + ') likhiye', [{ field: 'confirm', message: toSession + ' likhiye' }]);
    const schoolId = req.schoolId;

    const result = await sequelize.transaction(async (t) => {
        const school = await School.findByPk(schoolId, { lock: t.LOCK.UPDATE, transaction: t });
        const expected = nextSession(school.session);
        if (expected && toSession !== expected) throw ApiError.badRequest('Abhi ' + school.session + ' chal raha hai - agla session ' + expected + ' hi ho sakta hai');
        const dup = await PromotionRun.findOne({ where: { schoolId, toSession, undoneAt: null }, transaction: t });
        if (dup) throw ApiError.conflict(toSession + ' ka promotion pehle hi ho chuka hai');

        const classes = await loadClasses(schoolId, t);
        const classById = new Map(classes.map((c) => [c.id, c]));
        const sectionById = new Map(classes.flatMap((c) => c.sections.map((s) => [s.id, s])));

        const target = new Map();
        for (const m of classMap) {
            if (!classById.has(m.fromClassId)) throw ApiError.badRequest('Class #' + m.fromClassId + ' aapke school me nahi hai');
            if (m.toClassId !== null && !classById.has(m.toClassId)) throw ApiError.badRequest('Class #' + m.toClassId + ' aapke school me nahi hai');
            target.set(m.fromClassId, m.toClassId);
        }
        const secMap = new Map();
        for (const m of sectionMap) {
            const from = sectionById.get(m.fromSectionId);
            if (!from) throw ApiError.badRequest('Section #' + m.fromSectionId + ' aapke school me nahi hai');
            if (m.toSectionId !== null) {
                const to = sectionById.get(m.toSectionId);
                if (!to || to.classId !== target.get(from.classId)) throw ApiError.badRequest('Section mapping galat hai (' + from.name + ')');
            }
            secMap.set(m.fromSectionId, m.toSectionId);
        }

        const students = await Student.findAll({
            where: { schoolId, status: 'active', classId: { [Op.ne]: null } },
            attributes: ['id', 'classId', 'sectionId', 'rollNo', 'status'],
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        const missing = [...new Set(students.map((s) => s.classId))].filter((c) => !target.has(c));
        if (missing.length) throw ApiError.badRequest('In classes ka aage ka rasta chuniye: ' + missing.map((c) => classById.get(c)?.name || c).join(', '));

        const ov = new Map();
        const studentIds = new Set(students.map((s) => s.id));
        for (const o of overrides) {
            if (!studentIds.has(o.studentId)) throw ApiError.badRequest('Student #' + o.studentId + ' is list me nahi hai (active nahi / dusre school ka)');
            ov.set(o.studentId, o);
        }

        const run = await PromotionRun.create({ schoolId, fromSession: school.session, toSession, createdById: req.user.id, rollReset: resetRollNos }, { transaction: t });
        const groups = new Map();
        const snaps = [];
        const counts = { promoted: 0, detained: 0, graduated: 0, left: 0 };
        let noSection = 0;

        for (const s of students) {
            const o = ov.get(s.id);
            let outcome = o?.outcome || (target.get(s.classId) === null ? 'graduated' : 'promoted');
            let toClass = s.classId;
            let toSection = s.sectionId;
            let status = 'active';
            if (outcome === 'promoted') {
                toClass = target.get(s.classId);
                if (toClass === null) outcome = 'graduated';
            }
            if (outcome === 'promoted') {
                const cls = classById.get(toClass);
                if (o?.toSectionId) {
                    if (!cls.sections.some((x) => x.id === o.toSectionId)) throw ApiError.badRequest('Student #' + s.id + ' ka section ' + cls.name + ' ka nahi hai');
                    toSection = o.toSectionId;
                } else if (s.sectionId && secMap.has(s.sectionId)) toSection = secMap.get(s.sectionId);
                else {
                    const oldName = sectionById.get(s.sectionId)?.name;
                    toSection = cls.sections.find((x) => oldName && x.name.toLowerCase() === oldName.toLowerCase())?.id || (cls.sections.length === 1 ? cls.sections[0].id : null);
                }
                if (!toSection && cls.sections.length) noSection++;
            } else if (outcome === 'detained') {
                if (o?.toSectionId) {
                    if (!classById.get(s.classId).sections.some((x) => x.id === o.toSectionId)) throw ApiError.badRequest('Student #' + s.id + ' ka section us class ka nahi hai');
                    toSection = o.toSectionId;
                }
            } else {
                status = outcome === 'graduated' ? 'alumni' : 'inactive';
            }
            counts[outcome]++;
            snaps.push({
                schoolId,
                studentId: s.id,
                runId: run.id,
                session: school.session,
                classId: s.classId,
                sectionId: s.sectionId,
                className: classById.get(s.classId)?.name || null,
                sectionName: sectionById.get(s.sectionId)?.name || null,
                rollNo: s.rollNo,
                status: s.status,
                outcome,
                toClassId: status === 'active' ? toClass : null,
                toSectionId: status === 'active' ? toSection : null,
            });
            // Ek jaisa badlav wale students ek hi UPDATE me
            const key = [toClass, toSection, status].join('|');
            if (!groups.has(key)) groups.set(key, { patch: { classId: toClass, sectionId: toSection, status }, ids: [] });
            groups.get(key).ids.push(s.id);
        }

        await StudentEnrollment.bulkCreate(snaps, { transaction: t });
        for (const g of groups.values()) {
            await Student.update({ ...g.patch, ...(resetRollNos ? { rollNo: null } : {}) }, { where: { schoolId, id: g.ids }, transaction: t });
        }
        await school.update({ session: toSession }, { transaction: t });
        await run.update(counts, { transaction: t });
        logEvent({ action: 'session.promote', module: 'Session', entity: 'promotion', entityId: run.id, summary: 'Naya session ' + school.session + ' → ' + toSession + ': ' + counts.promoted + ' promote, ' + counts.detained + ' roke, ' + counts.graduated + ' pass-out, ' + counts.left + ' chhode', transaction: t });
        return { runId: run.id, fromSession: run.fromSession, toSession, ...counts, noSection, total: students.length };
    });

    res.status(201).json({
        success: true,
        message: 'Naya session ' + result.toSession + ' shuru - ' + result.promoted + ' promote, ' + result.detained + ' roke, ' + result.graduated + ' pass-out',
        data: result,
    });
});

export const runs = asyncHandler(async (req, res) => {
    const rows = await PromotionRun.findAll({
        where: { schoolId: req.schoolId },
        include: [{ model: User, as: 'createdBy', attributes: ['id', 'name'] }],
        order: [['id', 'DESC']],
        limit: 20,
    });
    const last = rows.find((r) => !r.undoneAt);
    res.json({ success: true, data: rows.map((r) => ({ ...r.toJSON(), canUndo: r === last && canUndo(r) })) });
});

/**
 * Aakhri promotion wapas. Jin students ko promotion ke baad haath se badla gaya
 * unhe nahi chhedte (unka naya kaam na mite) - list wapas dete hain.
 */
export const undo = asyncHandler(async (req, res) => {
    const out = await sequelize.transaction(async (t) => {
        const school = await School.findByPk(req.schoolId, { lock: t.LOCK.UPDATE, transaction: t });
        const run = await latestRun(req.schoolId, t);
        if (!run || run.id !== Number(req.params.id)) throw ApiError.badRequest('Sirf sabse aakhri promotion undo ho sakta hai');
        if (!canUndo(run)) throw ApiError.badRequest(UNDO_DAYS + ' din se purana promotion undo nahi hota');
        if (school.session !== run.toSession) throw ApiError.conflict('School ka session badal chuka hai (' + school.session + ') - undo nahi ho sakta');

        const snaps = await StudentEnrollment.findAll({ where: { runId: run.id }, transaction: t });
        const students = await Student.findAll({ where: { schoolId: req.schoolId, id: snaps.map((s) => s.studentId) }, transaction: t, lock: t.LOCK.UPDATE });
        const byId = new Map(students.map((s) => [s.id, s]));
        const skipped = [];
        let restored = 0;
        for (const snap of snaps) {
            const s = byId.get(snap.studentId);
            if (!s) continue;
            const expectActive = snap.toClassId !== null;
            const untouched = expectActive
                ? s.status === 'active' && s.classId === snap.toClassId && (s.sectionId || null) === (snap.toSectionId || null)
                : s.status !== 'active';
            if (!untouched) {
                skipped.push({ id: s.id, name: [s.firstName, s.lastName].filter(Boolean).join(' '), admissionNo: s.admissionNo });
                continue;
            }
            const patch = { classId: snap.classId, sectionId: snap.sectionId, status: snap.status || 'active' };
            if (run.rollReset) patch.rollNo = snap.rollNo;
            await s.update(patch, { transaction: t });
            restored++;
        }
        await StudentEnrollment.destroy({ where: { runId: run.id }, transaction: t });
        await run.update({ undoneAt: new Date(), undoneById: req.user.id }, { transaction: t });
        await school.update({ session: run.fromSession }, { transaction: t });
        logEvent({ action: 'session.undo', module: 'Session', entity: 'promotion', entityId: run.id, summary: 'Promotion undo ' + run.toSession + ' → ' + run.fromSession + ': ' + restored + ' wapas, ' + skipped.length + ' chhode', transaction: t });
        return { restored, skipped, session: run.fromSession };
    });
    res.json({
        success: true,
        message: 'Promotion undo - ' + out.restored + ' students wapas' + (out.skipped.length ? ', ' + out.skipped.length + ' ko baad me badla gaya tha isliye chhod diya' : ''),
        data: out,
    });
});

/** Ek student ka saal-dar-saal record */
export const studentHistory = asyncHandler(async (req, res) => {
    const student = await Student.findOne({ where: { id: req.params.studentId, schoolId: req.schoolId }, attributes: ['id'] });
    if (!student) throw ApiError.notFound('Student not found');
    const rows = await StudentEnrollment.findAll({
        where: { schoolId: req.schoolId, studentId: student.id },
        attributes: ['session', 'className', 'sectionName', 'rollNo', 'outcome', 'createdAt'],
        order: [['id', 'DESC']],
    });
    res.json({ success: true, data: rows });
});
