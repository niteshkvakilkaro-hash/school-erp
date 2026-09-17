import { z } from 'zod';
import { Op } from 'sequelize';
import { FeeHead, SchoolClass, StudentFee } from '../models/index.js';
import { FEE_FREQUENCY } from '../models/FeeHead.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { scopedWhere, findScoped, assertSameTenant } from '../utils/tenant.js';

const optionalFk = z
    .preprocess(
        (v) => (v === '' || v === null || v === undefined ? null : v),
        z.coerce.number().int().positive().nullable()
    )
    .optional();

export const createSchema = z.object({
    name: z.string().trim().min(2, 'Fee head ka naam chahiye').max(100),
    code: z
        .string()
        .trim()
        .min(2, 'Code chahiye')
        .max(20)
        .transform((v) => v.toUpperCase().replace(/\s+/g, '-')),
    amount: z.coerce.number().min(0, 'Amount 0 se kam nahi ho sakta'),
    frequency: z.enum(FEE_FREQUENCY).default('annual'),
    classId: optionalFk,
    isOptional: z.coerce.boolean().default(false),
    description: z.string().trim().max(255).optional(),
    status: z.enum(['active', 'inactive']).default('active'),
});

export const updateSchema = createSchema.partial();

export const querySchema = z.object({
    search: z.string().trim().optional(),
    classId: z.coerce.number().int().positive().optional(),
    status: z.enum(['active', 'inactive']).optional(),
});

const includes = [{ model: SchoolClass, as: 'schoolClass', attributes: ['id', 'name', 'level'] }];

export const list = asyncHandler(async (req, res) => {
    const where = scopedWhere(req);
    if (req.query.status) where.status = req.query.status;
    if (req.query.search) {
        const q = '%' + req.query.search + '%';
        where[Op.or] = [{ name: { [Op.like]: q } }, { code: { [Op.like]: q } }];
    }
    // Class chuni ho to us class ke + "sab classes wale" dono dikhne chahiye
    if (req.query.classId) {
        where[Op.and] = [{ [Op.or]: [{ classId: null }, { classId: req.query.classId }] }];
    }

    const rows = await FeeHead.findAll({ where, include: includes, order: [['name', 'ASC']] });

    // Har head kitne students par laga hua hai - delete se pehle warning ke liye
    const assigned = await StudentFee.findAll({
        attributes: ['feeHeadId'],
        where: scopedWhere(req),
    });
    const tally = {};
    for (const a of assigned) tally[a.feeHeadId] = (tally[a.feeHeadId] || 0) + 1;

    res.json({
        success: true,
        data: rows.map((r) => ({ ...r.toJSON(), assignedCount: tally[r.id] || 0 })),
    });
});

export const create = asyncHandler(async (req, res) => {
    await assertSameTenant(SchoolClass, req, req.body.classId, 'Class');

    const clash = await FeeHead.findOne({ where: scopedWhere(req, { code: req.body.code }) });
    if (clash) throw ApiError.conflict('Is code ka fee head pehle se hai');

    const item = await FeeHead.create({ ...req.body, schoolId: req.schoolId });
    const full = await FeeHead.findByPk(item.id, { include: includes });
    res.status(201).json({ success: true, message: 'Fee head ban gaya', data: full });
});

export const update = asyncHandler(async (req, res) => {
    const item = await findScoped(FeeHead, req, req.params.id);
    await assertSameTenant(SchoolClass, req, req.body.classId, 'Class');

    if (req.body.code && req.body.code !== item.code) {
        const clash = await FeeHead.findOne({
            where: scopedWhere(req, { code: req.body.code, id: { [Op.ne]: item.id } }),
        });
        if (clash) throw ApiError.conflict('Is code ka fee head pehle se hai');
    }

    await item.update(req.body);
    const full = await FeeHead.findByPk(item.id, { include: includes });
    res.json({ success: true, message: 'Fee head update ho gaya', data: full });
});

export const remove = asyncHandler(async (req, res) => {
    const item = await findScoped(FeeHead, req, req.params.id);

    // Students par laga hua head delete hone se unke invoices tut jayenge
    const assigned = await StudentFee.count({ where: { feeHeadId: item.id } });
    if (assigned > 0) {
        throw ApiError.conflict(
            'Ye fee head ' + assigned + ' students par laga hua hai - pehle unse hataiye ya inactive kar dijiye'
        );
    }

    await item.destroy();
    res.json({ success: true, message: 'Fee head delete ho gaya' });
});
