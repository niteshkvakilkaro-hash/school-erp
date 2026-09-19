import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import ExcelJS from 'exceljs';
import { Op } from 'sequelize';
import { sequelize, School, Student, User, Role, SchoolClass, Section, StudentGuardian, Subscription, Plan } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { normalizePhone } from './notify.js';

export const MAX_ROWS = 2000;

/**
 * Template ke columns. `aliases` = school ki apni Excel me jo naam ho sakte hain
 * (lowercase, sirf a-z0-9) - taaki purani sheet bina badle chal jaye.
 */
export const COLUMNS = [
    { key: 'admissionNo', label: 'Admission No', aliases: ['admissionno', 'admno', 'admissionnumber', 'admnno', 'regno', 'registrationno'], hint: 'Khaali = apne aap (ADM2026-0001)' },
    { key: 'firstName', label: 'First Name', required: true, aliases: ['firstname', 'fname', 'studentfirstname'] },
    { key: 'lastName', label: 'Last Name', aliases: ['lastname', 'surname', 'lname'] },
    { key: 'fullName', label: null, aliases: ['name', 'studentname', 'fullname', 'nameofstudent'] },
    { key: 'gender', label: 'Gender', aliases: ['gender', 'sex'], hint: 'Male / Female' },
    { key: 'dob', label: 'Date of Birth', aliases: ['dob', 'dateofbirth', 'birthdate', 'dobddmmyyyy'], hint: 'DD-MM-YYYY' },
    { key: 'class', label: 'Class', required: true, aliases: ['class', 'classname', 'std', 'standard', 'grade'] },
    { key: 'section', label: 'Section', aliases: ['section', 'sec', 'div', 'division'] },
    { key: 'rollNo', label: 'Roll No', aliases: ['rollno', 'roll', 'rollnumber'] },
    { key: 'fatherName', label: 'Father Name', aliases: ['fathername', 'father', 'fathersname'] },
    { key: 'motherName', label: 'Mother Name', aliases: ['mothername', 'mother', 'mothersname'] },
    { key: 'guardianPhone', label: 'Parent Mobile', aliases: ['parentmobile', 'guardianphone', 'phone', 'mobile', 'mobileno', 'parentphone', 'fathermobile', 'contact', 'contactno', 'guardianmobile', 'whatsapp'], hint: '10 digit' },
    { key: 'guardianEmail', label: 'Parent Email', aliases: ['parentemail', 'guardianemail', 'email', 'emailid'] },
    { key: 'bloodGroup', label: 'Blood Group', aliases: ['bloodgroup', 'blood'] },
    { key: 'address', label: 'Address', aliases: ['address', 'addr'] },
    { key: 'city', label: 'City', aliases: ['city', 'town'] },
    { key: 'admissionDate', label: 'Admission Date', aliases: ['admissiondate', 'doa', 'dateofadmission', 'joiningdate'], hint: 'DD-MM-YYYY' },
];
const headerKey = (h) => String(h ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const ALIAS = new Map(COLUMNS.flatMap((c) => c.aliases.map((a) => [a, c.key])));

/* ---------------- File padhna ---------------- */

function cellText(v) {
    if (v === null || v === undefined) return '';
    if (v instanceof Date) return v;
    if (typeof v === 'object') {
        if (v.richText) return v.richText.map((r) => r.text).join('');
        if ('result' in v) return cellText(v.result);
        if ('text' in v) return cellText(v.text);
        if (v.error) return '';
        return '';
    }
    return v;
}

/** Chhota RFC-4180 CSV parser (quotes, "" escape, CRLF). */
function parseCsv(text) {
    const rows = [];
    let row = [], field = '', q = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (q) {
            if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
            else if (ch === '"') q = false;
            else field += ch;
        } else if (ch === '"') q = true;
        else if (ch === ',') { row.push(field); field = ''; }
        else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && text[i + 1] === '\n') i++;
            row.push(field); rows.push(row); row = []; field = '';
        } else field += ch;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
}

/** Buffer -> [{ row: excelRowNo, values: { key: raw } }] */
export async function readSheet(file) {
    const name = (file.originalname || '').toLowerCase();
    let grid;
    if (name.endsWith('.csv')) {
        grid = parseCsv(file.buffer.toString('utf8').replace(/^﻿/, ''));
    } else if (name.endsWith('.xlsx')) {
        const wb = new ExcelJS.Workbook();
        try {
            await wb.xlsx.load(file.buffer);
        } catch {
            throw ApiError.badRequest('Excel file khul nahi paayi - kya ye sahi .xlsx hai?');
        }
        const ws = wb.getWorksheet('Students') || wb.worksheets.find((w) => w.state === 'visible') || wb.worksheets[0];
        if (!ws) throw ApiError.badRequest('Excel me koi sheet nahi mili');
        if (ws.rowCount > MAX_ROWS + 50) throw ApiError.badRequest('Ek baar me ' + MAX_ROWS + ' students tak - file ko hisson me baantiye');
        grid = [];
        ws.eachRow({ includeEmpty: true }, (r, n) => {
            const vals = [];
            r.eachCell({ includeEmpty: true }, (c, col) => (vals[col - 1] = cellText(c.value)));
            grid[n - 1] = vals;
        });
    } else if (name.endsWith('.xls')) {
        throw ApiError.badRequest('Purani .xls file - Excel me "Save As" → .xlsx karke daaliye');
    } else {
        throw ApiError.badRequest('Sirf .xlsx ya .csv file chalegi');
    }

    // Header row: pehli row jisme "first name"/"name" aur "class" jaisa kuch ho (upar title rows ho sakti hain)
    const headerIdx = grid.slice(0, 10).findIndex((r) => {
        const keys = (r || []).map((h) => ALIAS.get(headerKey(h)));
        return keys.includes('class') && (keys.includes('firstName') || keys.includes('fullName'));
    });
    if (headerIdx < 0) {
        throw ApiError.badRequest('Header row nahi mili - pehli line me "First Name" (ya "Name") aur "Class" column zaroori hain. Template download karke dekhiye.');
    }
    const map = (grid[headerIdx] || []).map((h) => ALIAS.get(headerKey(h)) || null);
    const unknown = (grid[headerIdx] || []).filter((h, i) => String(h ?? '').trim() && !map[i]).map((h) => String(h).trim());

    const rows = [];
    for (let i = headerIdx + 1; i < grid.length; i++) {
        const r = grid[i] || [];
        const values = {};
        map.forEach((k, ci) => {
            if (!k) return;
            const v = r[ci];
            if (v instanceof Date) values[k] = v;
            else if (v !== undefined && v !== null && String(v).trim() !== '') values[k] = String(v).trim();
        });
        if (Object.keys(values).length) rows.push({ row: i + 1, values });
    }
    if (!rows.length) throw ApiError.badRequest('File me koi student nahi mila');
    if (rows.length > MAX_ROWS) throw ApiError.badRequest('Ek baar me ' + MAX_ROWS + ' students tak - file ko hisson me baantiye');
    return { rows, unknownColumns: unknown };
}

/* ---------------- Values saaf karna ---------------- */

const pad = (n) => String(n).padStart(2, '0');
const iso = (y, m, d) => {
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
    return y + '-' + pad(m) + '-' + pad(d);
};
/** Excel date / serial number / DD-MM-YYYY / YYYY-MM-DD -> 'YYYY-MM-DD' (galat = null) */
export function parseDate(v) {
    if (v instanceof Date) return isNaN(v) ? null : iso(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate());
    const s = String(v).trim();
    if (/^\d{4,5}(\.\d+)?$/.test(s)) {
        const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(s)) * 86400000);
        return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    }
    let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (m) return iso(+m[1], +m[2], +m[3]);
    m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/);
    if (m) {
        let y = +m[3];
        if (m[3].length === 2) y += y > new Date().getFullYear() % 100 ? 1900 : 2000;
        return iso(y, +m[2], +m[1]); // Bharat me DD-MM-YYYY
    }
    const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    m = s.match(/^(\d{1,2})[-/ .]([a-z]{3})[a-z]*[-/ .,]+(\d{4})$/i);
    if (m && MONTHS.includes(m[2].toLowerCase())) return iso(+m[3], MONTHS.indexOf(m[2].toLowerCase()) + 1, +m[1]);
    return null;
}

const GENDER = { m: 'male', male: 'male', boy: 'male', b: 'male', f: 'female', female: 'female', girl: 'female', g: 'female', other: 'other', o: 'other' };
const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 };
/** "Class 5", "5th", "V", "std-5", "5" -> "5"; "LKG" -> "lkg" */
export function classKey(s) {
    let k = String(s ?? '').toLowerCase().replace(/\b(class|std|standard|grade)\b/g, '').replace(/[^a-z0-9]/g, '');
    k = k.replace(/^(\d+)(st|nd|rd|th)$/, '$1');
    if (ROMAN[k]) k = String(ROMAN[k]);
    return k;
}
const sectionKey = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
// 'aarav mehta' / 'AARAV MEHTA' -> 'Aarav Mehta'; jo pehle se mix case hai (McDonald) wahi rehta hai
const titleCase = (s) => {
    const t = String(s).replace(/\s+/g, ' ').trim();
    if (t !== t.toLowerCase() && t !== t.toUpperCase()) return t;
    return t.toLowerCase().replace(/(^|[\s.'-])([a-z])/g, (_, p, c) => p + c.toUpperCase());
};

/* ---------------- Poori file ka jaanch ---------------- */

export async function analyse(schoolId, parsed, { createParentLogins = false } = {}) {
    const classes = await SchoolClass.findAll({ where: { schoolId }, include: [{ model: Section, as: 'sections', attributes: ['id', 'name'] }], attributes: ['id', 'name', 'level'] });
    const byKey = new Map();
    for (const c of classes) {
        byKey.set(classKey(c.name), c);
        if (c.level !== null && c.level !== undefined && !byKey.has(String(c.level))) byKey.set(String(c.level), c);
    }

    const seenAdm = new Map();
    const out = [];
    for (const { row, values: v } of parsed.rows) {
        const errors = [];
        const warnings = [];
        const s = {};

        let first = v.firstName, last = v.lastName;
        if (!first && v.fullName) {
            const parts = titleCase(v.fullName).split(' ');
            first = parts.shift();
            last = last || parts.join(' ') || undefined;
        }
        if (!first) errors.push('First name khaali hai');
        s.firstName = first ? titleCase(first).slice(0, 60) : null;
        s.lastName = last ? titleCase(last).slice(0, 60) : null;
        if (first && first.length > 60) warnings.push('Naam 60 akshar se lamba - kaat diya');

        s.admissionNo = v.admissionNo ? String(v.admissionNo).trim() : null;
        if (s.admissionNo && s.admissionNo.length > 30) errors.push('Admission no 30 akshar se lamba');
        if (s.admissionNo) {
            const k = s.admissionNo.toLowerCase();
            if (seenAdm.has(k)) errors.push('Admission no ' + s.admissionNo + ' file me row ' + seenAdm.get(k) + ' par bhi hai');
            else seenAdm.set(k, row);
        }

        if (v.gender) {
            s.gender = GENDER[String(v.gender).toLowerCase().trim()] || null;
            if (!s.gender) errors.push('Gender samajh nahi aaya: "' + v.gender + '" (Male/Female likhiye)');
        }
        for (const [key, label] of [['dob', 'Date of birth'], ['admissionDate', 'Admission date']]) {
            if (!v[key]) continue;
            s[key] = parseDate(v[key]);
            if (!s[key]) errors.push(label + ' galat: "' + (v[key] instanceof Date ? v[key].toISOString() : v[key]) + '" (DD-MM-YYYY likhiye)');
        }
        if (s.dob) {
            const age = (Date.now() - Date.parse(s.dob)) / (365.25 * 86400000);
            if (age < 0) errors.push('Date of birth aage ki hai');
            else if (age < 1.5 || age > 25) warnings.push('Umar ' + Math.floor(age) + ' saal - DOB check kijiye');
        }

        const cls = v.class ? byKey.get(classKey(v.class)) : null;
        if (!v.class) errors.push('Class khaali hai');
        else if (!cls) errors.push('Class "' + v.class + '" school me nahi hai (' + classes.map((c) => c.name).join(', ') + ')');
        s.classId = cls?.id || null;
        s.className = cls?.name || v.class || null;
        if (cls) {
            const secs = cls.sections || [];
            if (v.section) {
                const sec = secs.find((x) => sectionKey(x.name) === sectionKey(v.section));
                if (!sec) errors.push('Section "' + v.section + '" ' + cls.name + ' me nahi hai' + (secs.length ? ' (' + secs.map((x) => x.name).join(', ') + ')' : ''));
                s.sectionId = sec?.id || null;
                s.sectionName = sec?.name || v.section;
            } else if (secs.length === 1) {
                s.sectionId = secs[0].id;
                s.sectionName = secs[0].name;
            } else if (secs.length > 1) {
                errors.push(cls.name + ' ka section likhiye (' + secs.map((x) => x.name).join(', ') + ')');
            }
        }

        s.rollNo = v.rollNo ? String(v.rollNo).slice(0, 20) : null;
        s.fatherName = v.fatherName ? titleCase(v.fatherName).slice(0, 120) : null;
        s.motherName = v.motherName ? titleCase(v.motherName).slice(0, 120) : null;
        s.bloodGroup = v.bloodGroup ? String(v.bloodGroup).toUpperCase().replace(/\s|VE$/g, '').slice(0, 5) : null;
        s.address = v.address ? String(v.address).slice(0, 255) : null;
        s.city = v.city ? titleCase(String(v.city)).slice(0, 80) : null;

        if (v.guardianPhone) {
            const p = normalizePhone(v.guardianPhone);
            if (!p) errors.push('Mobile galat: "' + v.guardianPhone + '" (10 digit)');
            s.guardianPhone = p ? p.slice(2) : null;
        } else warnings.push('Parent mobile nahi - SMS / OTP nahi jayega');
        if (v.guardianEmail) {
            const e = String(v.guardianEmail).trim().toLowerCase();
            if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(e) || e.length > 160) errors.push('Email galat: "' + v.guardianEmail + '"');
            s.guardianEmail = e;
        }
        out.push({ row, data: s, errors, warnings });
    }

    // Database se takraav: admission no pehle se hai
    const admNos = out.map((r) => r.data.admissionNo).filter(Boolean);
    if (admNos.length) {
        const taken = new Set(
            (await Student.findAll({ where: { schoolId, admissionNo: admNos }, attributes: ['admissionNo'] })).map((x) => x.admissionNo.toLowerCase())
        );
        for (const r of out) if (r.data.admissionNo && taken.has(r.data.admissionNo.toLowerCase())) r.errors.push('Admission no ' + r.data.admissionNo + ' pehle se school me hai');
    }
    // Roll no ek section me do baar (sirf chetavni)
    const rollSeen = new Map();
    for (const r of out) {
        if (!r.data.rollNo || !r.data.classId) continue;
        const k = r.data.classId + ':' + (r.data.sectionId || 0) + ':' + r.data.rollNo.toLowerCase();
        if (rollSeen.has(k)) r.warnings.push('Roll no ' + r.data.rollNo + ' row ' + rollSeen.get(k) + ' par bhi hai');
        else rollSeen.set(k, r.row);
    }
    // Same bachcha dobara? (naam + pita + class pehle se)
    const names = [...new Set(out.map((r) => r.data.firstName).filter(Boolean))];
    if (names.length) {
        const existing = await Student.findAll({ where: { schoolId, firstName: names }, attributes: ['firstName', 'lastName', 'fatherName', 'classId', 'admissionNo'] });
        const key = (x) => [x.firstName, x.lastName, x.fatherName, x.classId].map((p) => String(p || '').toLowerCase()).join('|');
        const ex = new Map(existing.map((x) => [key(x), x.admissionNo]));
        for (const r of out) if (ex.has(key(r.data))) r.warnings.push('Shayad pehle se hai (' + ex.get(key(r.data)) + ')');
    }

    const ready = out.filter((r) => !r.errors.length);
    const parents = createParentLogins ? await planParents(schoolId, ready) : null;
    return {
        rows: out,
        unknownColumns: parsed.unknownColumns,
        summary: {
            total: out.length,
            ready: ready.length,
            errors: out.length - ready.length,
            warnings: out.filter((r) => r.warnings.length).length,
            autoAdmissionNo: ready.filter((r) => !r.data.admissionNo).length,
            parentsNew: parents ? parents.filter((p) => !p.existingUserId).length : 0,
            parentsLinked: parents ? parents.filter((p) => p.existingUserId).length : 0,
        },
        parents,
    };
}

/** Ek mobile = ek parent login (bhai-behen ek hi login me). Pehle se parent ho to usi se jod do. */
async function planParents(schoolId, ready) {
    const school = await School.findByPk(schoolId, { attributes: ['code'] });
    const groups = new Map();
    for (const r of ready) {
        if (!r.data.guardianPhone) continue;
        const g = groups.get(r.data.guardianPhone) || { phone: r.data.guardianPhone, rows: [], email: null, name: null };
        g.rows.push(r);
        g.email = g.email || r.data.guardianEmail || null;
        g.name = g.name || r.data.fatherName || r.data.motherName || null;
        groups.set(r.data.guardianPhone, g);
    }
    if (!groups.size) return [];
    const phones = [...groups.keys()];
    const parentRole = await Role.findOne({ where: { schoolId, slug: 'parent' }, attributes: ['id'] });
    if (!parentRole) throw ApiError.badRequest('Parent role is school me nahi hai');
    const users = await User.findAll({
        where: { schoolId, [Op.or]: [{ phone: { [Op.in]: phones.flatMap((p) => [p, '91' + p, '+91' + p, '0' + p]) } }, { email: phones.map((p) => p + '@' + school.code.toLowerCase() + '.erpsc').concat([...groups.values()].map((g) => g.email).filter(Boolean)) }] },
        attributes: ['id', 'email', 'phone', 'roleId'],
    });
    const plan = [];
    for (const g of groups.values()) {
        const byPhone = users.find((u) => normalizePhone(u.phone) === '91' + g.phone && u.roleId === parentRole.id);
        const syntheticEmail = g.phone + '@' + school.code.toLowerCase() + '.erpsc';
        let email = g.email || syntheticEmail;
        const byEmail = users.find((u) => u.email === email);
        const p = { phone: g.phone, name: g.name || 'Parent of ' + g.rows[0].data.firstName, rowNos: g.rows.map((r) => r.row), roleId: parentRole.id };
        if (byPhone) p.existingUserId = byPhone.id;
        else if (byEmail && byEmail.roleId === parentRole.id) p.existingUserId = byEmail.id;
        else {
            if (byEmail) {
                // Email kisi staff / student ka hai - parent ke liye mobile wala email
                for (const r of g.rows) r.warnings.push('Email ' + email + ' kisi aur account par hai - parent login ' + syntheticEmail + ' se banega');
                email = syntheticEmail;
                if (users.find((u) => u.email === email)) { p.existingUserId = null; p.skip = true; }
            }
            p.email = email;
        }
        if (!p.skip) plan.push(p);
    }
    return plan;
}

/* ---------------- Import ---------------- */

const PW_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';
const newPassword = () => Array.from(crypto.randomBytes(8), (b) => PW_CHARS[b % PW_CHARS.length]).join('');

export async function commit(schoolId, analysed, { skipErrors = false } = {}) {
    const { rows, parents } = analysed;
    const bad = rows.filter((r) => r.errors.length);
    if (bad.length && !skipErrors) throw ApiError.badRequest(bad.length + ' rows me galti hai - theek kijiye ya "sirf sahi rows" chuniye');
    const ready = rows.filter((r) => !r.errors.length);
    if (!ready.length) throw ApiError.badRequest('Import karne layak koi row nahi');

    // Password hash transaction se pehle (bcrypt dheema hai - lock lamba na chale)
    const creds = [];
    const toCreate = [];
    for (const p of parents || []) {
        if (p.existingUserId) continue;
        const pw = newPassword();
        creds.push({ name: p.name, email: p.email, phone: p.phone, password: pw, rowNos: p.rowNos });
        toCreate.push({ ...p, passwordHash: await bcrypt.hash(pw, 10) });
    }

    return sequelize.transaction(async (t) => {
        await School.findByPk(schoolId, { lock: t.LOCK.UPDATE, transaction: t, attributes: ['id'] });

        // Plan ki seat limit - poori file ek saath
        const sub = await Subscription.findOne({ where: { schoolId, status: 'active' }, include: [{ model: Plan, as: 'plan', attributes: ['name', 'maxStudents'] }], order: [['endsOn', 'DESC']], transaction: t });
        const max = Number(sub?.plan?.maxStudents || 0);
        if (max) {
            const active = await Student.count({ where: { schoolId, status: 'active' }, transaction: t });
            if (active + ready.length > max) {
                throw ApiError.forbidden(sub.plan.name + ' plan me ' + max + ' students ki limit hai - abhi ' + active + ' hain, ' + ready.length + ' aur nahi aa sakte. Plan upgrade kijiye.');
            }
        }

        // Lock ke baad dobara: beech me kisi ne wahi admission no to nahi daala
        const given = ready.map((r) => r.data.admissionNo).filter(Boolean);
        if (given.length) {
            const clash = await Student.findOne({ where: { schoolId, admissionNo: given }, attributes: ['admissionNo'], transaction: t });
            if (clash) throw ApiError.conflict('Admission no ' + clash.admissionNo + ' abhi-abhi kisi ne daala - dobara preview kijiye');
        }
        const prefix = 'ADM' + new Date().getFullYear() + '-';
        const last = await Student.findOne({ where: { schoolId, admissionNo: { [Op.like]: prefix + '%' } }, order: [['admissionNo', 'DESC']], attributes: ['admissionNo'], transaction: t });
        let seq = last ? Number.parseInt(last.admissionNo.slice(prefix.length), 10) || 0 : 0;
        const takenGiven = new Set(given.map((g) => g.toLowerCase()));
        const nextAdm = () => {
            let a;
            do a = prefix + String(++seq).padStart(4, '0');
            while (takenGiven.has(a.toLowerCase()));
            return a;
        };

        const created = await Student.bulkCreate(
            ready.map((r) => {
                const { className, sectionName, ...d } = r.data;
                return { ...d, admissionNo: d.admissionNo || nextAdm(), schoolId, status: 'active', admissionDate: d.admissionDate || null };
            }),
            { transaction: t }
        );
        const byRow = new Map(ready.map((r, i) => [r.row, created[i]]));

        let parentsCreated = 0, parentsLinked = 0;
        const links = [];
        for (const p of parents || []) {
            let userId = p.existingUserId;
            if (!userId) {
                const tc = toCreate.find((x) => x.phone === p.phone);
                const u = await User.create(
                    { schoolId, roleId: p.roleId, name: p.name.slice(0, 120), email: p.email, password: tc.passwordHash, phone: p.phone, status: 'active' },
                    { transaction: t, hooks: false }
                );
                userId = u.id;
                parentsCreated++;
            } else parentsLinked++;
            p.rowNos.forEach((rowNo) => {
                const st = byRow.get(rowNo);
                if (st) links.push({ schoolId, userId, studentId: st.id, relation: 'guardian', isPrimary: true });
            });
        }
        if (links.length) await StudentGuardian.bulkCreate(links, { transaction: t });

        return {
            created: created.length,
            skipped: rows.length - ready.length,
            parentsCreated,
            parentsLinked,
            students: created.map((s) => ({ id: s.id, admissionNo: s.admissionNo, name: [s.firstName, s.lastName].filter(Boolean).join(' ') })),
            credentials: creds.map((c) => ({ ...c, students: c.rowNos.map((n) => byRow.get(n)).filter(Boolean).map((s) => s.firstName + ' (' + s.admissionNo + ')').join(', ') })),
        };
    });
}

/* ---------------- Template ---------------- */

export async function buildTemplate(schoolId) {
    const classes = await SchoolClass.findAll({ where: { schoolId }, include: [{ model: Section, as: 'sections', attributes: ['name'] }], order: [['level', 'ASC'], ['name', 'ASC']] });
    const wb = new ExcelJS.Workbook();
    wb.creator = 'ERPSC';
    const cols = COLUMNS.filter((c) => c.label);

    const ws = wb.addWorksheet('Students', { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = cols.map((c) => ({ header: c.label + (c.required ? ' *' : ''), key: c.key, width: Math.max(14, c.label.length + 4) }));
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
    ws.getRow(1).height = 22;
    cols.forEach((c, i) => {
        if (c.hint) ws.getCell(1, i + 1).note = c.hint;
        // Tarikh aur number text rahein - Excel 0 na kha jaye / date na badle
        if (['dob', 'admissionDate', 'guardianPhone', 'rollNo', 'admissionNo'].includes(c.key)) ws.getColumn(i + 1).numFmt = '@';
    });
    const col = (k) => cols.findIndex((c) => c.key === k) + 1;
    const classList = classes.map((c) => c.name);
    for (let r = 2; r <= 1001; r++) {
        ws.getCell(r, col('gender')).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Male,Female,Other"'] };
        if (classList.length && classList.join(',').length < 250) {
            ws.getCell(r, col('class')).dataValidation = { type: 'list', allowBlank: false, formulae: ['"' + classList.join(',') + '"'] };
        }
    }

    const ex = wb.addWorksheet('Example');
    ex.columns = cols.map((c) => ({ header: c.label, key: c.key, width: Math.max(14, c.label.length + 4) }));
    ex.getRow(1).font = { bold: true };
    const c1 = classes[0];
    ex.addRow({ admissionNo: '', firstName: 'Aarav', lastName: 'Sharma', gender: 'Male', dob: '15-08-2015', class: c1?.name || 'Class 5', section: c1?.sections?.[0]?.name || 'A', rollNo: '1', fatherName: 'Rajesh Sharma', motherName: 'Sunita Sharma', guardianPhone: '9876543210', guardianEmail: '', bloodGroup: 'B+', address: '12 MG Road', city: 'Indore', admissionDate: '01-04-2026' });
    ex.addRow({ admissionNo: '', firstName: 'Anaya', lastName: 'Sharma', gender: 'Female', dob: '02-01-2018', class: classes[1]?.name || c1?.name || 'Class 2', section: classes[1]?.sections?.[0]?.name || '', rollNo: '4', fatherName: 'Rajesh Sharma', guardianPhone: '9876543210', city: 'Indore' });

    const cl = wb.addWorksheet('Classes');
    cl.columns = [{ header: 'Class', width: 18 }, { header: 'Sections', width: 30 }];
    cl.getRow(1).font = { bold: true };
    for (const c of classes) cl.addRow([c.name, (c.sections || []).map((s) => s.name).join(', ') || '(section nahi)']);

    const help = wb.addWorksheet('Help');
    help.getColumn(1).width = 110;
    [
        'Students sheet bhariye - ek line = ek student. * wale column zaroori hain.',
        'Class aur Section wahi likhiye jo "Classes" sheet me hai ("5", "5th", "Class 5", "V" sab chalega).',
        'Date: DD-MM-YYYY (jaise 15-08-2015). Mobile: 10 digit.',
        'Admission No khaali chhodenge to software apne aap dega.',
        'Bhai-behen ka ek hi mobile likhiye - parent ka ek hi login banega, dono bachche usme dikhenge.',
        'Upload ke baad pehle preview dikhega - galti wali rows wahin theek kar sakte hain, tab tak kuch save nahi hota.',
        'Apni purani Excel bhi chalegi agar columns ke naam milte-julte hain (Name, Std, Mobile, Father Name...).',
    ].forEach((line) => help.addRow([line]));

    return wb.xlsx.writeBuffer();
}
