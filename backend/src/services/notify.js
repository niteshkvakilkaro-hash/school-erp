import { MessagingSetting, MessageLog, School } from '../models/index.js';
import { decrypt } from '../utils/secrets.js';

// Test me mock server par bhejne ke liye override
const MSG91_API = () => process.env.MSG91_API_BASE || 'https://control.msg91.com/api/v5';
const WA_API = () => process.env.WHATSAPP_API_BASE || 'https://graph.facebook.com/v20.0';

/**
 * Har event ka message aur uske variables (kram wahi jo provider ke approved
 * template me hai). {school} hamesha sabse pehle.
 */
export const TEMPLATES = {
    absent: { vars: ['school', 'student', 'date'], text: '{school}: {student} aaj ({date}) school nahi aaye. Koi baat ho to school se sampark karein.' },
    feeReceipt: { vars: ['school', 'student', 'amount', 'receipt'], text: '{school}: {student} ki Rs {amount} fees mil gayi. Receipt {receipt}. Dhanyavaad.' },
    feeReminder: { vars: ['school', 'student', 'amount'], text: '{school}: {student} ki Rs {amount} fees baaki hai. App se online bhi bhar sakte hain.' },
    leaveDecision: { vars: ['school', 'name', 'dates', 'status'], text: '{school}: {name}, aapki leave ({dates}) {status} ho gayi hai.' },
    test: { vars: ['school'], text: '{school}: ERPSC se test message. Setup sahi hai.' },
};

export const EVENT_LABELS = {
    absent: 'Bachcha absent',
    feeReceipt: 'Fees receipt',
    feeReminder: 'Fees reminder',
    leaveDecision: 'Staff leave approve/reject',
};

export async function msgSettingsFor(schoolId) {
    const [s] = await MessagingSetting.findOrCreate({ where: { schoolId }, defaults: { schoolId } });
    return s;
}

/** Indian mobile -> 91XXXXXXXXXX, warna null */
export function normalizePhone(p) {
    let d = String(p || '').replace(/\D/g, '');
    if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
    if (d.length === 10 && /^[6-9]/.test(d)) return '91' + d;
    if (d.length === 12 && d.startsWith('91') && /^[6-9]/.test(d[2])) return d;
    return null;
}

const render = (event, vars) => TEMPLATES[event].text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));

async function sendMsg91(s, event, phone, vars) {
    const templateId = s.templates[event];
    if (!templateId) return { status: 'skipped', error: 'MSG91 template id set nahi hai (' + event + ')' };
    const res = await fetch(MSG91_API() + '/flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authkey: decrypt(s.apiKeyEnc) || '' },
        body: JSON.stringify({
            template_id: templateId,
            short_url: '0',
            // DLT template me ##var1##, ##var2##... isi kram me
            recipients: [{ mobiles: phone, ...Object.fromEntries(TEMPLATES[event].vars.map((k, i) => ['var' + (i + 1), String(vars[k] ?? '')])) }],
        }),
        signal: AbortSignal.timeout(15000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.type === 'error') return { status: 'failed', error: String(body.message || res.status).slice(0, 250) };
    return { status: 'sent', providerRef: String(body.message || body.request_id || '').slice(0, 120) };
}

async function sendWhatsApp(s, event, phone, vars) {
    const template = s.templates[event];
    if (!template) return { status: 'skipped', error: 'WhatsApp template name set nahi hai (' + event + ')' };
    const res = await fetch(WA_API() + '/' + encodeURIComponent(s.senderId || '') + '/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (decrypt(s.apiKeyEnc) || '') },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phone,
            type: 'template',
            template: {
                name: template,
                language: { code: 'en' },
                components: [{ type: 'body', parameters: TEMPLATES[event].vars.map((k) => ({ type: 'text', text: String(vars[k] ?? '') })) }],
            },
        }),
        signal: AbortSignal.timeout(15000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { status: 'failed', error: String(body.error?.message || res.status).slice(0, 250) };
    return { status: 'sent', providerRef: String(body.messages?.[0]?.id || '').slice(0, 120) };
}

async function deliver(s, log, event, phone, vars) {
    try {
        let r;
        if (s.provider === 'demo') r = { status: 'sent', providerRef: 'demo' };
        else if (s.provider === 'msg91') r = await sendMsg91(s, event, phone, vars);
        else if (s.provider === 'whatsapp') r = await sendWhatsApp(s, event, phone, vars);
        else r = { status: 'skipped', error: 'Messaging band hai' };
        await log.update(r);
        return r;
    } catch (err) {
        const r = { status: 'failed', error: String(err.message || err).slice(0, 250) };
        await log.update(r).catch(() => {});
        return r;
    }
}

/**
 * Message bhejo - kaam ka response rukta nahi (background me jata hai).
 * recipients: [{ phone, studentId?, userId?, vars?, dedupeKey? }]
 * Event band ho ya provider none ho to kuch nahi hota. `wait: true` = test me await.
 */
export async function notify(schoolId, event, recipients, { wait = false, force = false } = {}) {
    try {
        const s = await msgSettingsFor(schoolId);
        if (s.provider === 'none' || (!force && !s.events[event])) return [];
        const school = await School.findByPk(schoolId, { attributes: ['name'] });
        const jobs = [];
        for (const r of recipients) {
            const vars = { school: school?.name || 'School', ...(r.vars || {}) };
            const phone = normalizePhone(r.phone);
            let log;
            try {
                log = await MessageLog.create({
                    schoolId,
                    event,
                    channel: s.provider === 'msg91' ? 'sms' : s.provider,
                    toPhone: phone || String(r.phone || '').slice(0, 20) || null,
                    body: render(event, vars).slice(0, 500),
                    status: phone ? 'queued' : 'skipped',
                    error: phone ? null : 'Mobile number sahi nahi hai',
                    studentId: r.studentId || null,
                    userId: r.userId || null,
                    dedupeKey: r.dedupeKey || null,
                });
            } catch (err) {
                // Pehle hi bheja ja chuka (dedupe) - dobara nahi
                if (err.name === 'SequelizeUniqueConstraintError') continue;
                throw err;
            }
            if (phone) jobs.push(() => deliver(s, log, event, phone, vars));
        }
        const run = () => Promise.all(jobs.map((j) => j()));
        if (wait) return run();
        setImmediate(() => run().catch(() => {}));
        return jobs.length;
    } catch (err) {
        // Message ki galti se asli kaam (attendance, payment) fail nahi hona chahiye
        console.error('[notify]', event, err.message);
        return [];
    }
}
