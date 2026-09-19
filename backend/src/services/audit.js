import { sequelize, AuditLog, Student, FeeHead } from '../models/index.js';
import { auditContext } from '../utils/auditContext.js';

// Ye kabhi log me nahi dikhte - sirf "(badla)"
const SECRET = new Set(['password', 'keySecretEnc', 'webhookSecretEnc', 'apiKeyEnc', 'otpHash']);
// Shor - inke badalne ka alag se matlab nahi
const NOISE = new Set(['id', 'schoolId', 'createdAt', 'updatedAt', 'lastLoginAt', 'tokenVersion', 'passwordChangedAt']);

const money = (v) => 'Rs ' + Number(v || 0).toLocaleString('en-IN');
const nameOf = (s) => (s ? [s.firstName, s.lastName].filter(Boolean).join(' ') + (s.admissionNo ? ' (' + s.admissionNo + ')' : '') : '');
async function studentName(id, t) {
    if (!id) return '';
    const s = await Student.findByPk(id, { attributes: ['firstName', 'lastName', 'admissionNo'], transaction: t });
    return nameOf(s);
}

/**
 * Kin tables ka har badlav log hota hai. describe = log me dikhne wala naam.
 * `on` = kaunse kaam (create / update / delete) - baaki shor hai.
 */
const TRACKED = {
    Student: { key: 'student', module: 'Students', label: 'Student', describe: (i) => nameOf(i) },
    User: { key: 'user', module: 'Users', label: 'User', describe: (i) => i.name + ' <' + i.email + '>' },
    Role: { key: 'role', module: 'Roles', label: 'Role', describe: (i) => i.name },
    School: { key: 'school', module: 'School', label: 'School settings', on: ['update'], describe: (i) => i.name },
    SchoolClass: { key: 'class', module: 'Classes', label: 'Class', describe: (i) => i.name },
    Section: { key: 'section', module: 'Classes', label: 'Section', describe: (i) => i.name },
    Subject: { key: 'subject', module: 'Classes', label: 'Subject', describe: (i) => i.name },
    FeeHead: { key: 'fee_head', module: 'Fees', label: 'Fee head', describe: (i) => i.name + ' (' + money(i.amount) + ')' },
    StudentFee: {
        key: 'student_fee',
        module: 'Fees',
        label: 'Student fee',
        on: ['update', 'delete'],
        describe: async (i, t) => {
            const head = await FeeHead.findByPk(i.feeHeadId, { attributes: ['name'], transaction: t });
            return (head?.name || 'Fee') + ' - ' + (await studentName(i.studentId, t));
        },
    },
    FeePayment: {
        key: 'fee_payment',
        module: 'Fees',
        label: 'Receipt',
        on: ['create', 'delete'],
        describe: async (i, t) => i.receiptNo + ' ' + money(i.amount) + ' (' + i.mode + ') - ' + (await studentName(i.studentId, t)),
    },
    Exam: { key: 'exam', module: 'Exams', label: 'Exam', describe: (i) => i.name },
    StaffAttendance: { key: 'staff_attendance', module: 'HR', label: 'Staff attendance', on: ['update', 'delete'], describe: (i) => 'user #' + i.userId + ' - ' + i.date },
    LeaveRequest: { key: 'leave', module: 'HR', label: 'Leave', on: ['update'], describe: (i) => 'user #' + i.userId + ' ' + i.fromDate + (i.toDate !== i.fromDate ? ' - ' + i.toDate : '') },
    HrSetting: { key: 'hr_settings', module: 'HR', label: 'HR settings', on: ['update'], describe: () => 'HR settings' },
    PaymentSetting: { key: 'payment_settings', module: 'Fees', label: 'Online payment settings', on: ['update'], describe: (i) => 'provider ' + i.provider },
    MessagingSetting: { key: 'messaging_settings', module: 'Messages', label: 'SMS / WhatsApp settings', on: ['update'], describe: (i) => 'provider ' + i.provider },
    Notice: { key: 'notice', module: 'Notices', label: 'Notice', describe: (i) => i.title },
};

const VERB = { create: 'banaya', update: 'badla', delete: 'hataya' };
const clip = (v) => {
    if (v === null || v === undefined) return null;
    if (v instanceof Date) return v.toISOString();
    if (typeof v === 'object') v = JSON.stringify(v);
    const s = String(v);
    return s.length > 200 ? s.slice(0, 200) + '…' : s;
};

function diffOf(inst, kind) {
    const out = {};
    if (kind === 'update') {
        for (const f of inst.changed() || []) {
            if (NOISE.has(f)) continue;
            const before = inst.previous(f);
            const after = inst.get(f);
            if (SECRET.has(f)) out[f] = { from: '***', to: '(badla)' };
            else if (clip(before) !== clip(after)) out[f] = { from: clip(before), to: clip(after) };
        }
    } else {
        for (const [f, v] of Object.entries(inst.get({ plain: true }))) {
            if (NOISE.has(f) || v === null || v === undefined || v === '') continue;
            out[f] = SECRET.has(f) ? '***' : clip(v);
        }
    }
    return out;
}

/** Log likho - transaction ho to commit ke baad (rollback hua to log bhi nahi). */
function persist(row, t) {
    const write = () =>
        AuditLog.create(row, { hooks: false }).catch((e) => console.error('[audit]', e.message));
    if (t && typeof t.afterCommit === 'function') t.afterCommit(write);
    else write();
}

function actor(ctx) {
    const u = ctx?.user;
    return {
        userId: u?.id || null,
        userName: u ? u.name : 'System',
        userRole: u ? u.role?.name || null : null,
        ip: ctx?.ip || null,
        userAgent: ctx?.ua || null,
    };
}

/**
 * Seedha event likho (login, promotion, import...). Request ke bahar (seed, cron)
 * bhi chalta hai agar schoolId diya ho.
 */
export function logEvent({ action, module, entity = null, entityId = null, summary, changes = null, schoolId, user, transaction } = {}) {
    const ctx = auditContext();
    const who = actor(user ? { ...ctx, user } : ctx);
    persist(
        {
            schoolId: schoolId !== undefined ? schoolId : ctx?.schoolId ?? null,
            ...who,
            action,
            module,
            entity,
            entityId: entityId === null ? null : String(entityId),
            summary: String(summary).slice(0, 500),
            changes,
        },
        transaction
    );
}

async function onChange(kind, inst, options) {
    const cfg = TRACKED[inst.constructor.name];
    if (!cfg || (cfg.on && !cfg.on.includes(kind))) return;
    const ctx = auditContext();
    // Sirf API request ke andar - seed / scripts ka shor nahi
    if (!ctx) return;
    const changes = diffOf(inst, kind);
    if (kind === 'update' && !Object.keys(changes).length) return;
    const t = options?.transaction;
    let what = '';
    try {
        what = await cfg.describe(inst, t);
    } catch {
        what = '#' + inst.id;
    }
    const fields = kind === 'update' ? ': ' + Object.keys(changes).join(', ') : '';
    persist(
        {
            schoolId: inst.schoolId ?? (cfg.key === 'school' ? inst.id : ctx.schoolId ?? null),
            ...actor(ctx),
            action: cfg.key + '.' + kind,
            module: cfg.module,
            entity: cfg.key,
            entityId: String(inst.id),
            summary: (cfg.label + ' ' + VERB[kind] + ' - ' + what + fields).slice(0, 500),
            changes,
        },
        t
    );
}

let installed = false;
export function installAuditHooks() {
    if (installed) return;
    installed = true;
    sequelize.addHook('afterCreate', 'audit', (i, o) => onChange('create', i, o));
    sequelize.addHook('afterUpdate', 'audit', (i, o) => onChange('update', i, o));
    sequelize.addHook('afterDestroy', 'audit', (i, o) => onChange('delete', i, o));
}

export const AUDIT_MODULES = [...new Set(Object.values(TRACKED).map((c) => c.module).concat(['Auth', 'Attendance', 'Exams', 'Session', 'Students', 'Backup']))].sort();
