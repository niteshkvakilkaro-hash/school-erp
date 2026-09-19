import { z } from 'zod';
import { Op, fn, col } from 'sequelize';
import { MessageLog } from '../models/index.js';
import { MSG_PROVIDERS, MSG_EVENTS } from '../models/MessagingSetting.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginated } from '../utils/pagination.js';
import { scopedWhere } from '../utils/tenant.js';
import { encrypt, mask, decrypt } from '../utils/secrets.js';
import { msgSettingsFor, notify, normalizePhone, TEMPLATES, EVENT_LABELS } from '../services/notify.js';

const TEMPLATE_KEYS = [...MSG_EVENTS, 'otp', 'test'];
const EXTRA_LABELS = { otp: 'Password reset OTP (hamesha chalu)', test: 'Test message' };

export const getSettings = asyncHandler(async (req, res) => {
    const s = await msgSettingsFor(req.schoolId);
    res.json({
        success: true,
        data: {
            provider: s.provider,
            senderId: s.senderId,
            apiKeySet: Boolean(s.apiKeyEnc),
            apiKeyHint: s.apiKeyEnc ? mask(decrypt(s.apiKeyEnc)) : null,
            events: s.events,
            templates: s.templates,
            // UI par event ka naam, sample text aur variables ka kram (template banate waqt kaam aata hai)
            catalog: TEMPLATE_KEYS.map((k) => ({ key: k, label: EVENT_LABELS[k] || EXTRA_LABELS[k], text: TEMPLATES[k].text, vars: TEMPLATES[k].vars })),
        },
    });
});

export const settingsSchema = z.object({
    provider: z.enum(MSG_PROVIDERS),
    // Khaali = purani hi rakho
    apiKey: z.string().trim().max(300).optional(),
    senderId: z.string().trim().max(60).optional().or(z.literal('')),
    events: z.object(Object.fromEntries(MSG_EVENTS.map((e) => [e, z.boolean().optional()]))).strict().optional(),
    templates: z
        .object(Object.fromEntries(TEMPLATE_KEYS.map((e) => [e, z.string().trim().max(100).regex(/^[\w.-]*$/, 'Template id me sirf letters, number, _ . -').optional()])))
        .strict()
        .optional(),
});

export const updateSettings = asyncHandler(async (req, res) => {
    const s = await msgSettingsFor(req.schoolId);
    const { provider, apiKey, senderId, events, templates } = req.body;
    const patch = { provider };
    if (apiKey) patch.apiKeyEnc = encrypt(apiKey);
    if (senderId !== undefined) patch.senderId = senderId || null;
    if (events) patch.events = { ...s.events, ...events };
    if (templates) patch.templates = { ...s.templates, ...templates };

    const hasKey = Boolean(patch.apiKeyEnc || s.apiKeyEnc);
    if ((provider === 'msg91' || provider === 'whatsapp') && !hasKey) {
        throw ApiError.badRequest(provider === 'msg91' ? 'MSG91 authkey daaliye' : 'WhatsApp access token daaliye', [{ field: 'apiKey', message: 'Zaroori' }]);
    }
    const sender = patch.senderId !== undefined ? patch.senderId : s.senderId;
    if (provider === 'whatsapp' && !/^\d{6,30}$/.test(sender || '')) {
        throw ApiError.badRequest('WhatsApp ka Phone number ID (sirf digits) daaliye', [{ field: 'senderId', message: 'Phone number ID' }]);
    }
    await s.update(patch);
    res.json({ success: true, message: provider === 'none' ? 'Messages band' : 'Message settings save ho gayi' });
});

export const testSchema = z.object({
    phone: z.string().trim().min(10).max(20),
});

/** Ek number par test message - turant bhejkar result batata hai. */
export const sendTest = asyncHandler(async (req, res) => {
    const s = await msgSettingsFor(req.schoolId);
    if (s.provider === 'none') throw ApiError.badRequest('Pehle provider chuniye aur save kijiye');
    if (!normalizePhone(req.body.phone)) throw ApiError.badRequest('10 digit mobile number daaliye', [{ field: 'phone', message: 'Galat number' }]);
    const [r] = await notify(req.schoolId, 'test', [{ phone: req.body.phone, userId: req.user.id }], { wait: true, force: true });
    if (!r) throw ApiError.badRequest('Message nahi gaya');
    if (r.status !== 'sent') throw ApiError.badRequest('Message nahi gaya: ' + (r.error || r.status));
    res.json({ success: true, message: s.provider === 'demo' ? 'Demo me message "bheja" gaya (asli SMS nahi)' : 'Test message bhej diya', data: r });
});

export const logsQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    status: z.enum(['queued', 'sent', 'failed', 'skipped']).optional(),
    event: z.enum(TEMPLATE_KEYS).optional(),
    search: z.string().trim().max(60).optional(),
});

export const listLogs = asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const where = scopedWhere(req);
    if (req.query.status) where.status = req.query.status;
    if (req.query.event) where.event = req.query.event;
    if (req.query.search) {
        const q = '%' + req.query.search.replace(/[%_]/g, '') + '%';
        where[Op.or] = [{ toPhone: { [Op.like]: q } }, { body: { [Op.like]: q } }];
    }
    const { rows, count } = await MessageLog.findAndCountAll({ where, order: [['id', 'DESC']], limit, offset });

    // Aaj ka hisaab - status wise
    const since = new Date(new Date().setHours(0, 0, 0, 0));
    const stats = await MessageLog.findAll({
        attributes: ['status', [fn('COUNT', col('id')), 'n']],
        where: scopedWhere(req, { createdAt: { [Op.gte]: since } }),
        group: ['status'],
        raw: true,
    });
    res.json({
        success: true,
        data: {
            ...paginated({ rows, count, page, limit }),
            today: Object.fromEntries(['queued', 'sent', 'failed', 'skipped'].map((k) => [k, Number(stats.find((x) => x.status === k)?.n || 0)])),
        },
    });
});
