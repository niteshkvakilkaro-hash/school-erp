import { z } from 'zod';
import { sequelize, SchoolSite, School, SiteMedia } from '../models/index.js';
import { MEDIA_KINDS, MEDIA_LIMITS } from '../models/SiteMedia.js';
import ApiError from '../utils/ApiError.js';
import { saveImage, removeFiles } from '../utils/upload.js';
import { findScoped, scopedWhere } from '../utils/tenant.js';
import { SITE_THEMES } from '../models/SchoolSite.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// '' = khaali kar do (null); field na bheja ho to undefined hi rahe, purana value na mite
const blankToNull = (v) => (typeof v === 'string' && v.trim() === '' ? null : v);
const text = (max) => z.preprocess(blankToNull, z.string().trim().max(max).nullable().optional());
const url = z.preprocess(blankToNull, z.string().trim().url('Poora link daaliye (https://...)').max(255).nullable().optional());

// youtube.com/watch?v=, youtu.be/, /shorts/, /embed/ aur vimeo.com/123
export const VIDEO_URL =
    /^https?:\/\/(www\.|m\.)?(youtube\.com\/(watch\?v=|shorts\/|embed\/)[\w-]{6,}|youtu\.be\/[\w-]{6,}|vimeo\.com\/\d+)/;

export const siteSchema = z.object({
    published: z.boolean().optional(),
    theme: z.enum(SITE_THEMES).optional(),
    tagline: text(160),
    heroTitle: text(120),
    heroHighlight: text(80),
    heroSubtitle: text(300),
    about: text(4000),
    establishedYear: z
        .preprocess((v) => (v === '' || v === null ? null : v), z.coerce.number().int().min(1800).max(2100).nullable())
        .optional(),
    affiliation: text(120),
    principalName: text(120),
    principalMessage: text(3000),
    highlights: z
        .array(z.object({ title: z.string().trim().min(1).max(60), text: z.string().trim().max(240).default('') }))
        .max(8, 'Max 8 highlights')
        .optional(),
    facilities: z.array(z.string().trim().min(1).max(60)).max(16, 'Max 16 facilities').optional(),
    socials: z
        .object({ facebook: url, instagram: url, youtube: url, whatsapp: text(20) })
        .partial()
        .optional(),
    videos: z
        .array(
            z.object({
                title: z.string().trim().max(100).default(''),
                url: z
                    .string()
                    .trim()
                    .regex(VIDEO_URL, 'Sirf YouTube ya Vimeo ka link'),
            })
        )
        .max(12, 'Max 12 videos')
        .optional(),
    testimonials: z
        .array(
            z.object({
                name: z.string().trim().min(1).max(80),
                role: z.string().trim().max(80).default(''),
                text: z.string().trim().min(5).max(500),
            })
        )
        .max(12, 'Max 12 reviews')
        .optional(),
    faqs: z
        .array(z.object({ q: z.string().trim().min(3).max(200), a: z.string().trim().min(2).max(1000) }))
        .max(15, 'Max 15 sawal')
        .optional(),
    showMap: z.boolean().optional(),
    showStats: z.boolean().optional(),
    admissionOpen: z.boolean().optional(),
    admissionNote: text(255),
});

/** Nayi website ka shuruaati content - school admin baad me badal sakta hai. */
export function defaultSite(school) {
    return {
        schoolId: school.id,
        published: false,
        theme: 'emerald',
        tagline: 'Admissions open for session ' + (school.session || new Date().getFullYear()),
        heroTitle: 'Learn today.',
        heroHighlight: 'Lead tomorrow.',
        heroSubtitle:
            school.name + ' brings caring teachers, modern classrooms and a joyful campus together so every child can grow with confidence.',
        about:
            'At ' + school.name + ' we believe every child is capable of great things. Our curriculum balances strong academics with sports, arts and values, and our teachers know every student by name.',
        principalName: null,
        principalMessage: null,
        highlights: [
            { title: 'Experienced faculty', text: 'Qualified teachers who mentor, not just teach.' },
            { title: 'Smart classrooms', text: 'Digital boards and hands-on labs for real understanding.' },
            { title: 'Safe transport', text: 'GPS-ready buses with trained staff on every route.' },
            { title: 'Parent app', text: 'Attendance, homework, fees and results on your phone.' },
        ],
        facilities: ['Science labs', 'Computer lab', 'Library', 'Sports ground', 'Music & art', 'Transport'],
        socials: {},
        showStats: true,
        admissionOpen: true,
        admissionNote: null,
    };
}

export async function siteFor(school) {
    const [site] = await SchoolSite.findOrCreate({ where: { schoolId: school.id }, defaults: defaultSite(school) });
    return site;
}

const listMedia = (schoolId) =>
    SiteMedia.findAll({ where: { schoolId }, order: [['kind', 'ASC'], ['sortOrder', 'ASC'], ['id', 'ASC']] });

export const get = asyncHandler(async (req, res) => {
    const school = req.school || (await School.findByPk(req.schoolId));
    const site = await siteFor(school);
    res.json({
        success: true,
        data: {
            site,
            school: { name: school.name, slug: school.slug, logo: school.logo },
            themes: SITE_THEMES,
            media: await listMedia(school.id),
            limits: MEDIA_LIMITS,
        },
    });
});

export const update = asyncHandler(async (req, res) => {
    const school = req.school || (await School.findByPk(req.schoolId));
    const site = await siteFor(school);
    await site.update(req.body);
    res.json({
        success: true,
        message: site.published ? 'Website update ho gayi - live hai' : 'Save ho gaya (abhi publish nahi hai)',
        data: site,
    });
});

/* ---------------- Photos ---------------- */

export const mediaFieldsSchema = z.object({
    kind: z.enum(MEDIA_KINDS),
    title: z.string().trim().max(120).optional(),
    caption: z.string().trim().max(255).optional(),
    category: z.string().trim().max(40).optional(),
});
export const mediaUpdateSchema = mediaFieldsSchema.omit({ kind: true });
export const reorderSchema = z.object({
    kind: z.enum(['slide', 'gallery']),
    ids: z.array(z.coerce.number().int().positive()).min(1).max(100),
});

/**
 * Photo upload. Logo aur principal ki ek hi photo rehti hai - nayi aane par
 * purani file delete. Slider/gallery ki limit MEDIA_LIMITS me.
 */
export const uploadMedia = asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('Photo chuniye');
    const parsed = mediaFieldsSchema.safeParse(req.body);
    if (!parsed.success) throw ApiError.badRequest('Photo ki details galat hain');
    const { kind, title, caption, category } = parsed.data;

    const single = kind === 'logo' || kind === 'principal';
    if (!single) {
        const count = await SiteMedia.count({ where: scopedWhere(req, { kind }) });
        if (count >= MEDIA_LIMITS[kind]) {
            throw ApiError.badRequest((kind === 'slide' ? 'Slider' : 'Gallery') + ' me max ' + MEDIA_LIMITS[kind] + ' photos - pehle kuch hataiye');
        }
    }

    const img = await saveImage(req.file.buffer, req.schoolId, kind);

    let item;
    try {
        item = await sequelize.transaction(async (t) => {
            let old = [];
            if (single) {
                old = await SiteMedia.findAll({ where: scopedWhere(req, { kind }), transaction: t });
                await SiteMedia.destroy({ where: scopedWhere(req, { kind }), transaction: t });
            }
            const last = single ? null : await SiteMedia.max('sortOrder', { where: scopedWhere(req, { kind }), transaction: t });
            const created = await SiteMedia.create(
                {
                    schoolId: req.schoolId,
                    kind,
                    ...img,
                    title: title || null,
                    caption: caption || null,
                    category: kind === 'gallery' ? category || 'Campus' : null,
                    sortOrder: (last ?? -1) + 1,
                },
                { transaction: t }
            );
            // Logo poore system ka hai - ERP me bhi dikhta hai
            if (kind === 'logo') await School.update({ logo: img.url }, { where: { id: req.schoolId }, transaction: t });
            created._old = old;
            return created;
        });
    } catch (err) {
        await removeFiles(img.url, img.thumbUrl);
        throw err;
    }
    for (const o of item._old) await removeFiles(o.url, o.thumbUrl);

    res.status(201).json({ success: true, message: 'Photo upload ho gayi', data: item });
});

export const updateMedia = asyncHandler(async (req, res) => {
    const item = await findScoped(SiteMedia, req, req.params.id);
    const patch = { ...req.body };
    if (item.kind !== 'gallery') delete patch.category;
    await item.update(patch);
    res.json({ success: true, message: 'Save ho gaya', data: item });
});

/** Slider/gallery ka naya kram - ids isi school aur isi kind ke hone chahiye. */
export const reorderMedia = asyncHandler(async (req, res) => {
    const { kind, ids } = req.body;
    const rows = await SiteMedia.findAll({ where: scopedWhere(req, { kind, id: ids }), attributes: ['id'] });
    if (rows.length !== new Set(ids).size) throw ApiError.badRequest('Kuch photos is school ki nahi hain');
    await sequelize.transaction(async (t) => {
        for (const [i, id] of ids.entries()) {
            await SiteMedia.update({ sortOrder: i }, { where: { id, schoolId: req.schoolId }, transaction: t });
        }
    });
    res.json({ success: true, message: 'Kram save ho gaya' });
});

export const removeMedia = asyncHandler(async (req, res) => {
    const item = await findScoped(SiteMedia, req, req.params.id);
    await sequelize.transaction(async (t) => {
        await item.destroy({ transaction: t });
        if (item.kind === 'logo') await School.update({ logo: null }, { where: { id: req.schoolId, logo: item.url }, transaction: t });
    });
    await removeFiles(item.url, item.thumbUrl);
    res.json({ success: true, message: 'Photo hata di' });
});
