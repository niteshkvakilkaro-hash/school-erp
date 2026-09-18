import { z } from 'zod';
import { SchoolSite, School } from '../models/index.js';
import { SITE_THEMES } from '../models/SchoolSite.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// '' = khaali kar do (null); field na bheja ho to undefined hi rahe, purana value na mite
const blankToNull = (v) => (typeof v === 'string' && v.trim() === '' ? null : v);
const text = (max) => z.preprocess(blankToNull, z.string().trim().max(max).nullable().optional());
const url = z.preprocess(blankToNull, z.string().trim().url('Poora link daaliye (https://...)').max(255).nullable().optional());

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

export const get = asyncHandler(async (req, res) => {
    const school = req.school || (await School.findByPk(req.schoolId));
    const site = await siteFor(school);
    res.json({ success: true, data: { site, school: { name: school.name, slug: school.slug }, themes: SITE_THEMES } });
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
