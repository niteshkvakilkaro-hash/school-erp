import { z } from 'zod';
import { Op, fn, col } from 'sequelize';
import { AuditLog } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginated } from '../utils/pagination.js';
import { AUDIT_MODULES } from '../services/audit.js';

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const querySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    module: z.string().max(30).optional(),
    userId: z.coerce.number().int().positive().optional(),
    entity: z.string().max(40).optional(),
    entityId: z.string().max(40).optional(),
    from: day.optional(),
    to: day.optional(),
    search: z.string().trim().max(80).optional(),
});

// School user sirf apne school ka; Super Admin school chune bina = platform ke kaam
const scope = (req) => ({ schoolId: req.schoolId ?? null });

function whereFor(req) {
    const q = req.query;
    const where = scope(req);
    if (q.module) where.module = q.module;
    if (q.userId) where.userId = q.userId;
    if (q.entity) where.entity = q.entity;
    if (q.entityId) where.entityId = q.entityId;
    // Tareekh India time me - UTC me badal kar
    if (q.from || q.to) {
        where.createdAt = {};
        if (q.from) where.createdAt[Op.gte] = new Date(q.from + 'T00:00:00+05:30');
        if (q.to) where.createdAt[Op.lt] = new Date(new Date(q.to + 'T00:00:00+05:30').getTime() + 86400000);
    }
    if (q.search) {
        const s = '%' + q.search.replace(/[%_\\]/g, '') + '%';
        where[Op.or] = [{ summary: { [Op.like]: s } }, { userName: { [Op.like]: s } }, { changes: { [Op.like]: s } }];
    }
    return where;
}

export const list = asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const { rows, count } = await AuditLog.findAndCountAll({ where: whereFor(req), order: [['id', 'DESC']], limit, offset });
    res.json({ success: true, data: paginated({ rows, count, page, limit }) });
});

/** Filter dropdown - is school me jin logon ne kuch kiya */
export const filters = asyncHandler(async (req, res) => {
    const users = await AuditLog.findAll({
        where: { ...scope(req), userId: { [Op.ne]: null } },
        attributes: ['userId', [fn('MAX', col('user_name')), 'userName'], [fn('MAX', col('user_role')), 'userRole']],
        group: ['userId'],
        order: [[fn('MAX', col('user_name')), 'ASC']],
        raw: true,
    });
    res.json({ success: true, data: { modules: AUDIT_MODULES, users } });
});

// Excel me "=..." formula na chale (CSV injection)
const cell = (v) => {
    let s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
};

export const exportCsv = asyncHandler(async (req, res) => {
    const rows = await AuditLog.findAll({ where: whereFor(req), order: [['id', 'DESC']], limit: 5000 });
    const lines = [['Time (IST)', 'User', 'Role', 'Module', 'Action', 'Summary', 'Changes', 'IP'].map(cell).join(',')];
    for (const r of rows) {
        const t = new Date(r.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        lines.push([t, r.userName, r.userRole, r.module, r.action, r.summary, r.changes, r.ip].map(cell).join(','));
    }
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="activity-log.csv"');
    res.send('﻿' + lines.join('\r\n'));
});
