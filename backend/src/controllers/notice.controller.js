import { z } from 'zod';
import { Op } from 'sequelize';
import { Notice, SchoolClass, Section, User, Teacher, Student } from '../models/index.js';
import { NOTICE_CATEGORIES, NOTICE_AUDIENCES, NOTICE_PRIORITIES } from '../models/Notice.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginated } from '../utils/pagination.js';
import { scopedWhere, findScoped, assertSameTenant } from '../utils/tenant.js';

const dateStr = z.coerce.date().transform((d) => d.toISOString().slice(0, 10));
const optionalDate = z
    .preprocess((v) => (v === '' || v === null || v === undefined ? null : v), dateStr.nullable())
    .optional();
const optionalFk = z
    .preprocess(
        (v) => (v === '' || v === null || v === undefined ? null : v),
        z.coerce.number().int().positive().nullable()
    )
    .optional();

const today = () => new Date().toISOString().slice(0, 10);

export const createSchema = z.object({
    title: z.string().trim().min(3, 'Title kam se kam 3 character ka ho').max(160),
    body: z.string().trim().min(3, 'Notice ka content chahiye').max(8000),
    category: z.enum(NOTICE_CATEGORIES).default('general'),
    audience: z.enum(NOTICE_AUDIENCES).default('all'),
    priority: z.enum(NOTICE_PRIORITIES).default('medium'),
    classId: optionalFk,
    sectionId: optionalFk,
    publishOn: dateStr,
    expiresOn: optionalDate,
    eventDate: optionalDate,
    attachmentUrl: z.string().trim().max(255).optional(),
    isPublished: z.coerce.boolean().default(true),
});

export const updateSchema = createSchema.partial();

export const querySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().trim().optional(),
    category: z.enum(NOTICE_CATEGORIES).optional(),
    audience: z.enum(NOTICE_AUDIENCES).optional(),
    status: z.enum(['live', 'scheduled', 'expired', 'draft']).optional(),
});

const includes = [
    { model: SchoolClass, as: 'schoolClass', attributes: ['id', 'name'] },
    { model: Section, as: 'section', attributes: ['id', 'name'] },
    { model: User, as: 'createdBy', attributes: ['id', 'name'] },
];

/** Notice ki current haalat - date + isPublished se nikalti hai. */
function statusOf(n, d) {
    if (!n.isPublished) return 'draft';
    if (n.publishOn > d) return 'scheduled';
    if (n.expiresOn && n.expiresOn < d) return 'expired';
    return 'live';
}

const shape = (n, d) => ({
    ...n.toJSON(),
    status: statusOf(n, d),
});

/** audience = class hone par class zaroori hai, warna notice kisi ko nahi dikhegi. */
async function assertAudience(req, body, existing) {
    const audience = body.audience ?? existing?.audience;
    const classId = body.classId !== undefined ? body.classId : existing?.classId;
    const sectionId = body.sectionId !== undefined ? body.sectionId : existing?.sectionId;

    if (audience === 'class' && !classId) {
        throw ApiError.badRequest('Class audience ke liye class chunna zaroori hai', [
            { field: 'classId', message: 'Class chuniye' },
        ]);
    }

    if (classId) await assertSameTenant(SchoolClass, req, classId, 'Class');
    if (sectionId) {
        const section = await assertSameTenant(Section, req, sectionId, 'Section');
        if (classId && Number(section.classId) !== Number(classId)) {
            throw ApiError.badRequest('Ye section chuni hui class ka nahi hai', [
                { field: 'sectionId', message: 'Class ke hisaab se section chuniye' },
            ]);
        }
    }

    const publishOn = body.publishOn ?? existing?.publishOn;
    const expiresOn = body.expiresOn !== undefined ? body.expiresOn : existing?.expiresOn;
    if (publishOn && expiresOn && expiresOn < publishOn) {
        throw ApiError.badRequest('Expiry date publish date se pehle nahi ho sakti', [
            { field: 'expiresOn', message: 'Publish date ke baad ki date chuniye' },
        ]);
    }
}

/* ---------------- Admin CRUD ---------------- */

export const list = asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const d = today();

    const where = scopedWhere(req);
    if (req.query.category) where.category = req.query.category;
    if (req.query.audience) where.audience = req.query.audience;
    if (req.query.search) {
        const q = '%' + req.query.search + '%';
        where[Op.or] = [{ title: { [Op.like]: q } }, { body: { [Op.like]: q } }];
    }

    // Status date-derived hai, isliye filter bhi date par lagta hai
    if (req.query.status === 'draft') where.isPublished = false;
    if (req.query.status === 'scheduled') {
        where.isPublished = true;
        where.publishOn = { [Op.gt]: d };
    }
    if (req.query.status === 'expired') {
        where.isPublished = true;
        where.expiresOn = { [Op.lt]: d };
    }
    if (req.query.status === 'live') {
        where.isPublished = true;
        where.publishOn = { [Op.lte]: d };
        where[Op.and] = [{ [Op.or]: [{ expiresOn: null }, { expiresOn: { [Op.gte]: d } }] }];
    }

    const { rows, count } = await Notice.findAndCountAll({
        where,
        include: includes,
        order: [
            ['publishOn', 'DESC'],
            ['id', 'DESC'],
        ],
        limit,
        offset,
        subQuery: false,
    });

    res.json({ success: true, data: paginated({ rows: rows.map((n) => shape(n, d)), count, page, limit }) });
});

export const getOne = asyncHandler(async (req, res) => {
    const item = await findScoped(Notice, req, req.params.id, { include: includes });
    res.json({ success: true, data: shape(item, today()) });
});

export const create = asyncHandler(async (req, res) => {
    await assertAudience(req, req.body);

    const item = await Notice.create({
        ...req.body,
        // Class audience nahi hai to class/section rakhne ka matlab nahi
        classId: req.body.audience === 'class' ? req.body.classId : null,
        sectionId: req.body.audience === 'class' ? req.body.sectionId : null,
        schoolId: req.schoolId,
        createdById: req.user.id,
    });

    const full = await Notice.findByPk(item.id, { include: includes });
    res.status(201).json({ success: true, message: 'Notice publish ho gaya', data: shape(full, today()) });
});

export const update = asyncHandler(async (req, res) => {
    const item = await findScoped(Notice, req, req.params.id);
    await assertAudience(req, req.body, item);

    const patch = { ...req.body };
    const audience = req.body.audience ?? item.audience;
    if (audience !== 'class') {
        patch.classId = null;
        patch.sectionId = null;
    }

    await item.update(patch);
    const full = await Notice.findByPk(item.id, { include: includes });
    res.json({ success: true, message: 'Notice update ho gaya', data: shape(full, today()) });
});

export const remove = asyncHandler(async (req, res) => {
    const item = await findScoped(Notice, req, req.params.id);
    await item.destroy();
    res.json({ success: true, message: 'Notice delete ho gaya' });
});

/* ---------------- Feed (kise kya dikhega) ---------------- */

/**
 * Sirf live notices, aur wahi jo is audience ke liye hain.
 *
 * `role` me se nikalte hain:
 *  - staff (teacher/admin/accountant) ko: all + staff
 *  - student ko: all + students + uski class wali
 *  - parent ko: all + parents + apne bachcho ki class wali
 *
 * Class-wale notices me sectionId ho to sirf usi section ko dikhta hai.
 */
export async function feedFor(req, { audiences, classIds = [], sectionIds = [], limit = 30 } = {}) {
    const d = today();

    // audience = 'class' wale alag se match hote hain, isliye OR ke do hisse
    const audienceMatch = [{ audience: audiences }];
    if (classIds.length) {
        audienceMatch.push({
            audience: 'class',
            classId: classIds,
            [Op.or]: [{ sectionId: null }, { sectionId: sectionIds.length ? sectionIds : null }],
        });
    }

    const rows = await Notice.findAll({
        where: scopedWhere(req, {
            isPublished: true,
            publishOn: { [Op.lte]: d },
            [Op.and]: [
                { [Op.or]: [{ expiresOn: null }, { expiresOn: { [Op.gte]: d } }] },
                { [Op.or]: audienceMatch },
            ],
        }),
        include: [
            { model: SchoolClass, as: 'schoolClass', attributes: ['id', 'name'] },
            { model: Section, as: 'section', attributes: ['id', 'name'] },
            { model: User, as: 'createdBy', attributes: ['id', 'name'] },
        ],
        order: [
            ['publishOn', 'DESC'],
            ['id', 'DESC'],
        ],
        limit,
    });

    return rows.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        category: n.category,
        priority: n.priority,
        publishOn: n.publishOn,
        eventDate: n.eventDate,
        expiresOn: n.expiresOn,
        attachmentUrl: n.attachmentUrl,
        forClass: n.schoolClass
            ? n.schoolClass.name + (n.section ? ' - ' + n.section.name : '')
            : null,
        createdBy: n.createdBy?.name || null,
    }));
}

/** Logged-in user kaun hai, uske hisaab se audience list banti hai. */
async function audienceForUser(req) {
    const slug = req.user.role?.slug;

    if (slug === 'student') {
        const student = await Student.findOne({
            where: scopedWhere(req, { userId: req.user.id }),
            attributes: ['id', 'classId', 'sectionId'],
        });
        return {
            audiences: ['all', 'students'],
            classIds: student?.classId ? [student.classId] : [],
            sectionIds: student?.sectionId ? [student.sectionId] : [],
        };
    }

    if (slug === 'parent') {
        const children = await Student.findAll({
            attributes: ['id', 'classId', 'sectionId'],
            where: scopedWhere(req),
            include: [
                { model: User, as: 'guardians', where: { id: req.user.id }, attributes: [], through: { attributes: [] } },
            ],
        });
        return {
            audiences: ['all', 'parents'],
            classIds: children.map((c) => c.classId).filter(Boolean),
            sectionIds: children.map((c) => c.sectionId).filter(Boolean),
        };
    }

    // Teacher / admin / accountant - staff notices dikhti hain, class wali nahi
    return { audiences: ['all', 'staff'], classIds: [], sectionIds: [] };
}

/** Dashboard aur Notices page ka feed - logged-in user ke hisaab se. */
export const feed = asyncHandler(async (req, res) => {
    const target = await audienceForUser(req);
    const items = await feedFor(req, { ...target, limit: 30 });
    res.json({ success: true, data: items });
});

export async function feedSnapshot(req, limit = 4) {
    const target = await audienceForUser(req);
    return feedFor(req, { ...target, limit });
}

/** Mobile app - ek student (ya uske parent) ke liye. */
export async function forStudent(req, student, limit = 30) {
    const isParent = req.user.role?.slug === 'parent';
    return feedFor(req, {
        audiences: ['all', isParent ? 'parents' : 'students'],
        classIds: student.classId ? [student.classId] : [],
        sectionIds: student.sectionId ? [student.sectionId] : [],
        limit,
    });
}
