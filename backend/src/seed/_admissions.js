import { sequelize, Admission, AdmissionLog, SchoolClass, Student } from '../models/index.js';

const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
};

const FIRST = [
    ['Aarav', 'male'], ['Ishita', 'female'], ['Reyansh', 'male'], ['Saanvi', 'female'], ['Vihaan', 'male'],
    ['Anika', 'female'], ['Atharv', 'male'], ['Kiara', 'female'], ['Shaurya', 'male'], ['Myra', 'female'],
    ['Dhruv', 'male'], ['Pari', 'female'], ['Ayaan', 'male'], ['Navya', 'female'], ['Krish', 'male'],
    ['Aadhya', 'female'], ['Rudra', 'male'], ['Anvi', 'female'],
];
const LAST = ['Agarwal', 'Chouhan', 'Dubey', 'Jain', 'Khandelwal', 'Mishra', 'Pandey', 'Rathore', 'Saxena', 'Tiwari'];
const FATHER = ['Rakesh', 'Sunil', 'Manoj', 'Ajay', 'Vivek', 'Sanjay', 'Deepak', 'Amit', 'Rohit', 'Nitin'];
const SOURCES = ['walk-in', 'phone', 'website', 'referral', 'social', 'walk-in', 'referral'];
const PREV = ['Little Flowers Play School', 'St. Mary Convent', 'Kidzee', 'DPS', null];

// [status, created days ago, path of stages (for timeline), follow-up offset (+ = aage, - = beet gaya)]
const PLAN = [
    ['enquiry', 1, [], 2], ['enquiry', 2, [], 0], ['enquiry', 3, [], -2], ['enquiry', 6, [], -1], ['enquiry', 9, [], 5],
    ['applied', 5, ['applied'], 1], ['applied', 8, ['applied'], -3], ['applied', 12, ['applied'], 3], ['applied', 15, ['applied'], null],
    ['interview', 10, ['applied', 'interview'], null], ['interview', 14, ['applied', 'interview'], null], ['interview', 18, ['applied', 'interview'], null],
    ['approved', 16, ['applied', 'interview', 'approved'], 1], ['approved', 20, ['applied', 'approved'], -1], ['approved', 22, ['applied', 'interview', 'approved'], 4],
    ['rejected', 25, ['applied', 'interview', 'rejected'], null], ['withdrawn', 28, ['applied', 'withdrawn'], null],
    ['rejected', 35, ['rejected'], null],
];

const NOTES = {
    applied: 'Form aur documents jama',
    interview: 'Parent interaction schedule kiya',
    approved: 'Interview theek raha - approve',
    rejected: 'Is class me seats full, waiting list me bhi jagah nahi',
    withdrawn: 'Parents ne doosre school me admission le liya',
};

/**
 * Har stage ki enquiries timeline ke saath. Kuch follow-ups aaj/beete hue
 * rakhe hain taaki "Follow-up due" dikhe, aur kuch interview aaj ke.
 * Pichhle admitted students ke liye bhi application record banta hai.
 */
export async function seedAdmissions(school, users) {
    const classes = await SchoolClass.findAll({ where: { schoolId: school.id }, order: [['level', 'ASC']] });
    const year = new Date().getFullYear();
    let seq = 0;
    let logs = 0;

    const stamp = async (table, id, date) => {
        await sequelize.query('UPDATE ' + table + ' SET created_at = ? WHERE id = ?', { replacements: [date, id] });
    };

    const mk = async (data, createdOn, path, extra = {}) => {
        seq++;
        const a = await Admission.create({
            schoolId: school.id,
            applicationNo: 'ENQ' + year + '-' + String(seq).padStart(4, '0'),
            createdById: users.admin.id,
            ...data,
            ...extra,
        });
        await stamp('admissions', a.id, createdOn);

        const first = await AdmissionLog.create({
            schoolId: school.id,
            admissionId: a.id,
            toStatus: 'enquiry',
            note: 'Enquiry li gayi (' + data.source + ')',
            userId: users.admin.id,
        });
        await stamp('admission_logs', first.id, createdOn);
        logs++;

        let from = 'enquiry';
        for (const [i, to] of path.entries()) {
            const when = new Date(createdOn.getTime() + (i + 1) * 2 * 86400000);
            const l = await AdmissionLog.create({
                schoolId: school.id,
                admissionId: a.id,
                fromStatus: from,
                toStatus: to,
                note: extra.stepNotes?.[to] || NOTES[to] || null,
                userId: users.admin.id,
            });
            await stamp('admission_logs', l.id, when > new Date() ? new Date() : when);
            from = to;
            logs++;
        }
        return a;
    };

    for (const [i, [status, ago, path, fu]] of PLAN.entries()) {
        const [firstName, gender] = FIRST[i % FIRST.length];
        const lastName = LAST[(i * 3) % LAST.length];
        const cls = classes[i % classes.length];
        const created = daysAgo(ago);

        let interviewAt = null;
        if (status === 'interview') {
            // Ek aaj, ek kal, ek parson
            interviewAt = new Date();
            interviewAt.setDate(interviewAt.getDate() + (i % 3));
            interviewAt.setHours(10 + (i % 3), 30, 0, 0);
        }

        await mk(
            {
                firstName,
                lastName,
                gender,
                dob: iso(new Date(year - 5 - (cls.level || 1), i % 12, 3 + i)),
                classId: cls.id,
                fatherName: FATHER[i % FATHER.length] + ' ' + lastName,
                motherName: null,
                guardianPhone: '98' + String(26000000 + i * 7919).slice(0, 8),
                guardianEmail: i % 3 === 0 ? firstName.toLowerCase() + '.' + lastName.toLowerCase() + '@gmail.com' : null,
                city: school.city,
                previousSchool: PREV[i % PREV.length],
                source: SOURCES[i % SOURCES.length],
                status,
                interviewAt,
                followUpOn: fu === null ? null : iso(daysAgo(-fu)),
            },
            created,
            path
        );
    }

    // Jo students is session me aaye unka application record
    const recent = await Student.findAll({
        where: { schoolId: school.id, status: 'active' },
        order: [['id', 'DESC']],
        limit: 4,
    });
    for (const [i, s] of recent.entries()) {
        const created = daysAgo(40 + i * 6);
        const admittedOn = iso(daysAgo(30 + i * 5));
        await mk(
            {
                firstName: s.firstName,
                lastName: s.lastName,
                gender: s.gender,
                dob: s.dob,
                classId: s.classId,
                fatherName: s.fatherName,
                motherName: s.motherName,
                guardianPhone: s.guardianPhone || '9800000000',
                guardianEmail: s.guardianEmail,
                address: s.address,
                city: s.city,
                source: SOURCES[(i + 2) % SOURCES.length],
                status: 'admitted',
                studentId: s.id,
                admittedOn,
            },
            created,
            ['applied', 'approved', 'admitted'],
            { stepNotes: { admitted: 'Student ' + s.admissionNo + ' bana' } }
        );
    }

    return { admissions: seq, logs };
}
