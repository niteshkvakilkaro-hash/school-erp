import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import {
    sequelize, School, User, Student, Teacher, SchoolClass, Notice, Admission, AdmissionLog,
} from '../models/index.js';
import { env } from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { siteFor } from './website.controller.js';
import { OPEN, nextNumber } from './admission.controller.js';

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Bina login wali website. Token aaye aur wo isi school (ya super admin) ka ho
 * to unpublished site bhi dikhti hai - admin preview ke liye.
 */
async function canPreview(req, school) {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return false;
    try {
        const payload = jwt.verify(header.slice(7).trim(), env.jwt.secret);
        const user = await User.findByPk(payload.id, { attributes: ['id', 'schoolId', 'status'] });
        return Boolean(user && user.status === 'active' && (user.schoolId === null || user.schoolId === school.id));
    } catch {
        return false;
    }
}

async function loadSchool(slug) {
    const school = await School.findOne({ where: { slug } });
    // Suspended school ki site bhi band
    if (!school || school.status === 'suspended') throw ApiError.notFound('Website nahi mili');
    return school;
}

export const site = asyncHandler(async (req, res) => {
    const school = await loadSchool(req.params.slug);
    const s = await siteFor(school);
    const preview = !s.published && (await canPreview(req, school));
    if (!s.published && !preview) throw ApiError.notFound('Website abhi publish nahi hui');

    const d = today();
    const [students, teachers, classes, notices] = await Promise.all([
        Student.count({ where: { schoolId: school.id, status: 'active' } }),
        Teacher.count({ where: { schoolId: school.id, status: 'active' } }),
        SchoolClass.findAll({ where: { schoolId: school.id }, attributes: ['id', 'name'], order: [['level', 'ASC']] }),
        Notice.findAll({
            where: {
                schoolId: school.id,
                showOnWebsite: true,
                isPublished: true,
                publishOn: { [Op.lte]: d },
                [Op.or]: [{ expiresOn: null }, { expiresOn: { [Op.gte]: d } }],
            },
            attributes: ['id', 'title', 'body', 'category', 'eventDate', 'publishOn'],
            order: [['publishOn', 'DESC']],
            limit: 6,
        }),
    ]);

    const json = s.toJSON();
    // Website ke setting fields - internal id/timestamps bahar nahi
    delete json.id;
    delete json.schoolId;

    res.json({
        success: true,
        data: {
            preview,
            school: {
                name: school.name,
                slug: school.slug,
                city: school.city,
                state: school.state,
                address: school.address,
                pincode: school.pincode,
                phone: school.phone,
                email: school.email,
                logo: school.logo,
                session: school.session,
            },
            site: json,
            stats: s.showStats
                ? {
                      students,
                      teachers,
                      classes: classes.length,
                      years: s.establishedYear ? new Date().getFullYear() - s.establishedYear : null,
                  }
                : null,
            classes: s.admissionOpen ? classes : [],
            notices: notices.map((n) => ({
                ...n.toJSON(),
                body: n.body.length > 220 ? n.body.slice(0, 217) + '...' : n.body,
            })),
        },
    });
});

export const enquirySchema = z.object({
    studentName: z.string().trim().min(2, 'Bachche ka naam likhiye').max(120),
    classId: z.coerce.number().int().positive({ message: 'Class chuniye' }),
    parentName: z.string().trim().max(120).optional().or(z.literal('')),
    phone: z
        .string()
        .trim()
        .regex(/^[0-9+\-\s]{7,20}$/, 'Sahi phone number daaliye'),
    email: z.union([z.string().trim().toLowerCase().email('Sahi email daaliye'), z.literal('')]).optional(),
    message: z.string().trim().max(1000).optional().or(z.literal('')),
    // Spam trap - insaan ko ye field dikhta hi nahi
    website: z.string().optional(),
});

const THANKS = 'Shukriya! Hamari admission team jald hi aapko call karegi.';

export const enquiry = asyncHandler(async (req, res) => {
    const school = await loadSchool(req.params.slug);
    const s = await siteFor(school);
    if (!s.published) throw ApiError.notFound('Website abhi publish nahi hui');
    if (!s.admissionOpen) throw ApiError.badRequest('Abhi admissions band hain');

    const { studentName, classId, parentName, phone, email, message, website } = req.body;
    // Bot ne hidden field bhara - chupchaap "ok" bol do, kuch save mat karo
    if (website) return res.status(201).json({ success: true, message: THANKS });

    const cls = await SchoolClass.findOne({ where: { id: classId, schoolId: school.id } });
    if (!cls) throw ApiError.badRequest('Class chuniye', [{ field: 'classId', message: 'Class chuniye' }]);

    const [firstName, ...rest] = studentName.split(/\s+/);
    const lastName = rest.join(' ') || null;

    const dup = await Admission.findOne({
        where: { schoolId: school.id, guardianPhone: phone, firstName, classId, status: OPEN },
    });
    if (dup) {
        // Pehle se khuli enquiry - dobara na banayein, bas note chhod dein
        await AdmissionLog.create({
            schoolId: school.id,
            admissionId: dup.id,
            note: 'Website se dobara enquiry aayi' + (message ? ': ' + message : ''),
        });
        return res.status(201).json({ success: true, message: THANKS, data: { reference: dup.applicationNo } });
    }

    const created = await sequelize.transaction(async (t) => {
        await School.findByPk(school.id, { lock: t.LOCK.UPDATE, transaction: t });
        const applicationNo = await nextNumber(Admission, 'applicationNo', 'ENQ' + new Date().getFullYear() + '-', school.id, t);
        const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
        const a = await Admission.create(
            {
                schoolId: school.id,
                applicationNo,
                firstName,
                lastName,
                classId,
                fatherName: parentName || null,
                guardianPhone: phone,
                guardianEmail: email || null,
                source: 'website',
                followUpOn: tomorrow,
            },
            { transaction: t }
        );
        await AdmissionLog.create(
            {
                schoolId: school.id,
                admissionId: a.id,
                toStatus: 'enquiry',
                note: 'Website se enquiry' + (message ? ': ' + message : ''),
            },
            { transaction: t }
        );
        return a;
    });

    res.status(201).json({ success: true, message: THANKS, data: { reference: created.applicationNo } });
});
