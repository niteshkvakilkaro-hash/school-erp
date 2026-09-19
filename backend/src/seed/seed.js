import { connectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import {
    sequelize,
    School,
    Plan,
    Subscription,
    Permission,
    Role,
    User,
    Teacher,
    Student,
    StudentGuardian,
    SchoolClass,
    Section,
    Subject,
    Attendance,
    Homework,
    Exam,
    ExamSubject,
    Mark,
} from '../models/index.js';
import { PERMISSIONS, SYSTEM_ROLES } from '../config/permissions.js';
import { seedRolesForSchool, syncRolePermissions } from '../services/rbac.service.js';
import { seedAttendance, seedHomework, seedExams } from './_academics.js';
import { seedFees } from './_fees.js';
import { seedTimetable } from './_timetable.js';
import { seedNotices } from './_notices.js';
import { seedLibrary } from './_library.js';
import { seedTransport } from './_transport.js';
import { seedAdmissions } from './_admissions.js';
import { seedWebsite } from './_website.js';
import { seedWebsiteMedia } from './_websiteMedia.js';
import { UPLOAD_ROOT, PRIVATE_ROOT } from '../utils/upload.js';
import { seedHr } from './_hr.js';
import { PaymentSetting, MessagingSetting } from '../models/index.js';
import fsp from 'node:fs/promises';
import path from 'node:path';

const FORCE = process.argv.includes('--force');

const PLANS = [
    ['Starter', 'STARTER', 1999, 300, 25, 'Core modules, 300 students tak, email support'],
    ['Growth', 'GROWTH', 4999, 1200, 80, 'Core + reports, 1200 students tak, priority support'],
    ['Enterprise', 'ENTERPRISE', 9999, 0, 0, 'Unlimited students, custom roles, dedicated support'],
];

const SCHOOLS = [
    {
        name: 'Sunrise Public School',
        code: 'SPS-INDORE',
        city: 'Indore',
        state: 'Madhya Pradesh',
        phone: '0731-2500100',
        email: 'office@sunrise.edu.in',
        status: 'active',
        planCode: 'GROWTH',
        admin: ['Rajesh Tiwari', 'admin@sunrise.com'],
        classes: [
            ['Class 6', 6, ['A', 'B']],
            ['Class 7', 7, ['A', 'B']],
            ['Class 8', 8, ['A']],
            ['Class 9', 9, ['A', 'B']],
            ['Class 10', 10, ['A']],
        ],
        teachers: [
            ['Anita Sharma', 'anita.sharma@sunrise.com', 'EMP001', 'female', 'M.Sc, B.Ed', 'Mathematics', 9],
            ['Rakesh Verma', 'rakesh.verma@sunrise.com', 'EMP002', 'male', 'M.A, B.Ed', 'English', 12],
            ['Priya Nair', 'priya.nair@sunrise.com', 'EMP003', 'female', 'M.Sc, B.Ed', 'Science', 6],
            ['Imran Khan', 'imran.khan@sunrise.com', 'EMP004', 'male', 'M.Com, B.Ed', 'Commerce', 8],
            ['Sunita Patel', 'sunita.patel@sunrise.com', 'EMP005', 'female', 'M.A History', 'Social Science', 4],
        ],
        studentsPerSection: 6,
    },
    {
        name: 'Green Valley Academy',
        code: 'GVA-BHOPAL',
        city: 'Bhopal',
        state: 'Madhya Pradesh',
        phone: '0755-2600200',
        email: 'info@greenvalley.edu.in',
        status: 'trial',
        planCode: 'STARTER',
        admin: ['Meena Joshi', 'admin@greenvalley.com'],
        classes: [
            ['Class 1', 1, ['A']],
            ['Class 2', 2, ['A']],
            ['Class 3', 3, ['A', 'B']],
        ],
        teachers: [
            ['Kavita Rao', 'kavita.rao@greenvalley.com', 'GV001', 'female', 'B.Ed', 'Primary', 5],
            ['Deepak Yadav', 'deepak.yadav@greenvalley.com', 'GV002', 'male', 'M.A, B.Ed', 'Hindi', 7],
        ],
        studentsPerSection: 4,
    },
];

const SUBJECTS = [
    ['Mathematics', 'MATH', 'theory'],
    ['English', 'ENG', 'theory'],
    ['Science', 'SCI', 'theory'],
    ['Social Science', 'SST', 'theory'],
    ['Hindi', 'HIN', 'theory'],
    ['Computer Science', 'CS', 'practical'],
];

const FIRST = ['Aarav', 'Vivaan', 'Diya', 'Ananya', 'Ishaan', 'Kabir', 'Myra', 'Reyansh', 'Saanvi', 'Aditya', 'Kiara', 'Arjun'];
const LAST = ['Sharma', 'Gupta', 'Singh', 'Patel', 'Reddy', 'Nair', 'Joshi', 'Mehta'];
const pick = (arr, i) => arr[Math.abs(i) % arr.length];
const slugify = (v) => v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Permission catalog ko config file ke hisaab se sync karta hai. */
async function syncPermissions() {
    for (const p of PERMISSIONS) {
        await Permission.findOrCreate({ where: { slug: p.slug }, defaults: p });
    }
    // Config se hataayi gayi permissions DB se bhi hat jaani chahiye
    const slugs = PERMISSIONS.map((p) => p.slug);
    const stale = await Permission.findAll();
    for (const p of stale) {
        if (!slugs.includes(p.slug)) await p.destroy();
    }
    console.log('[seed] ' + PERMISSIONS.length + ' permissions synced');
}

async function seedSuperAdmin() {
    const template = SYSTEM_ROLES.find((r) => r.slug === 'super-admin');

    const [role] = await Role.findOrCreate({
        where: { schoolId: null, slug: 'super-admin' },
        defaults: {
            schoolId: null,
            slug: 'super-admin',
            name: template.name,
            description: template.description,
            scope: 'platform',
            isSystem: true,
        },
    });
    await syncRolePermissions(role, template.permissions);

    const [admin, created] = await User.findOrCreate({
        where: { schoolId: null, email: env.seed.adminEmail },
        defaults: {
            schoolId: null,
            roleId: role.id,
            name: env.seed.adminName,
            email: env.seed.adminEmail,
            password: env.seed.adminPassword,
        },
    });
    console.log('[seed] super admin ' + (created ? 'created' : 'already present') + ': ' + admin.email);
    return admin;
}

async function seedSchool(def, planMap) {
    const school = await School.create({
        name: def.name,
        code: def.code,
        slug: slugify(def.name),
        city: def.city,
        state: def.state,
        phone: def.phone,
        email: def.email,
        session: '2026-27',
        status: def.status,
    });

    const roles = await seedRolesForSchool(school.id);

    // School Admin
    const adminUser = await User.create({
        schoolId: school.id,
        roleId: roles['school-admin'].id,
        name: def.admin[0],
        email: def.admin[1],
        password: 'admin123',
    });

    // Subscription
    const plan = planMap[def.planCode];
    if (plan) {
        const startsOn = new Date();
        const endsOn = new Date();
        endsOn.setFullYear(endsOn.getFullYear() + 1);
        await Subscription.create({
            schoolId: school.id,
            planId: plan.id,
            startsOn,
            endsOn,
            amount: Number(plan.pricePerMonth) * 12,
        });
    }

    // Teachers
    const teachers = [];
    for (const [i, [name, email, employeeNo, gender, qualification, specialization, exp]] of def.teachers.entries()) {
        const user = await User.create({
            schoolId: school.id,
            roleId: roles.teacher.id,
            name,
            email,
            password: 'teacher123',
            phone: '98' + String(10000000 + i * 137),
        });
        teachers.push(
            await Teacher.create({
                schoolId: school.id,
                userId: user.id,
                employeeNo,
                gender,
                qualification,
                specialization,
                experienceYears: exp,
                joiningDate: '2019-06-15',
                salary: 35000 + exp * 1500,
                city: def.city,
            })
        );
    }

    // Classes + sections
    const classes = [];
    const sections = [];
    for (const [idx, [name, level, sectionNames]] of def.classes.entries()) {
        const cls = await SchoolClass.create({
            schoolId: school.id,
            name,
            level,
            classTeacherId: pick(teachers, idx).id,
        });
        classes.push(cls);
        for (const [sIdx, sName] of sectionNames.entries()) {
            sections.push(
                await Section.create({
                    schoolId: school.id,
                    name: sName,
                    classId: cls.id,
                    capacity: 40,
                    teacherId: pick(teachers, idx + sIdx).id,
                    roomNo: 'R-' + level + sName,
                })
            );
        }
    }

    // Subjects
    for (const cls of classes) {
        for (const [sIdx, [name, code, type]] of SUBJECTS.entries()) {
            await Subject.create({
                schoolId: school.id,
                name,
                code: code + '-' + cls.level,
                classId: cls.id,
                teacherId: pick(teachers, sIdx).id,
                type,
            });
        }
    }
    return { school, roles, classes, sections, teachers, users: { admin: adminUser } };
}

/** Students + ek demo student login + ek demo parent login. */
async function seedStudents(ctx, def) {
    const { school, roles, classes, sections } = ctx;
    let n = 0;
    let demoStudent = null;

    for (const section of sections) {
        const cls = classes.find((c) => c.id === section.classId);
        for (let i = 0; i < def.studentsPerSection; i++) {
            n++;
            const firstName = pick(FIRST, n + i);
            const lastName = pick(LAST, n);

            const student = await Student.create({
                schoolId: school.id,
                admissionNo: 'ADM2026-' + String(n).padStart(4, '0'),
                firstName,
                lastName,
                gender: n % 2 === 0 ? 'male' : 'female',
                dob: '2012-0' + ((n % 9) + 1) + '-1' + (n % 9),
                bloodGroup: pick(['A+', 'B+', 'O+', 'AB+'], n),
                classId: cls.id,
                sectionId: section.id,
                rollNo: String(i + 1).padStart(2, '0'),
                fatherName: pick(FIRST, n + 3) + ' ' + lastName,
                motherName: pick(FIRST, n + 5) + ' ' + lastName,
                guardianPhone: '9' + String(700000000 + n * 1234),
                city: def.city,
                admissionDate: '2026-04-05',
            });

            if (!demoStudent) demoStudent = student;
        }
    }

    // Pehle student ko app ke liye login aur ek parent account de dete hain
    if (demoStudent) {
        const domain = def.admin[1].split('@')[1];

        const studentUser = await User.create({
            schoolId: school.id,
            roleId: roles.student.id,
            name: demoStudent.firstName + ' ' + demoStudent.lastName,
            email: 'student@' + domain,
            password: 'student123',
        });
        await demoStudent.update({ userId: studentUser.id });

        const parentUser = await User.create({
            schoolId: school.id,
            roleId: roles.parent.id,
            name: demoStudent.fatherName,
            email: 'parent@' + domain,
            password: 'parent123',
            phone: demoStudent.guardianPhone,
        });
        await StudentGuardian.create({
            schoolId: school.id,
            userId: parentUser.id,
            studentId: demoStudent.id,
            relation: 'father',
            isPrimary: true,
        });
    }

    return n;
}

async function run() {
    await connectDatabase();

    if (FORCE) {
        await sequelize.sync({ force: true });
        // Purane schools ki uploaded photos bhi saaf - DB ke saath mel khaye
        await fsp.rm(path.join(UPLOAD_ROOT, 'schools'), { recursive: true, force: true });
        await fsp.rm(path.join(PRIVATE_ROOT, 'attendance'), { recursive: true, force: true });
        console.log('[seed] saari tables dubara bana di gayi (--force)');
    } else {
        await sequelize.sync({ alter: true });
        console.log('[seed] tables synced');
    }

    await syncPermissions();
    await seedSuperAdmin();

    if ((await School.count()) > 0 && !FORCE) {
        console.log('[seed] schools pehle se hain - demo data skip. Fresh ke liye: npm run db:reset');
        return;
    }

    const planMap = {};
    for (const [name, code, price, maxStudents, maxTeachers, features] of PLANS) {
        const [plan] = await Plan.findOrCreate({
            where: { code },
            defaults: { name, code, pricePerMonth: price, maxStudents, maxTeachers, features },
        });
        planMap[code] = plan;
    }
    console.log('[seed] ' + PLANS.length + ' plans');

    const lines = [];
    for (const def of SCHOOLS) {
        const ctx = await seedSchool(def, planMap);
        const studentCount = await seedStudents(ctx, def);
        const domain = def.admin[1].split('@')[1];

        const attendanceRows = await seedAttendance(ctx.school, ctx.classes, ctx.sections, ctx.users);
        const homeworkRows = await seedHomework(ctx.school, ctx.classes, ctx.teachers);
        const examStats = await seedExams(ctx.school, ctx.classes, ctx.users);
        const feeStats = await seedFees(ctx.school, ctx.users);
        const ttStats = await seedTimetable(ctx.school);
        const noticeCount = await seedNotices(ctx.school, ctx.users);
        const libStats = await seedLibrary(ctx.school, ctx.users);
        const trStats = await seedTransport(ctx.school);
        const admStats = await seedAdmissions(ctx.school, ctx.users);
        const siteTheme = await seedWebsite(ctx.school);
        const photoCount = await seedWebsiteMedia(ctx.school);
        const hrStats = await seedHr(ctx.school);
        // Demo me online fee payment chalu - asli paisa nahi katta
        await PaymentSetting.create({ schoolId: ctx.school.id, provider: 'demo' });
        await MessagingSetting.create({ schoolId: ctx.school.id, provider: 'demo' });

        console.log(
            '[seed] ' + def.name + ' (' + def.code + '): ' +
            def.teachers.length + ' teachers, ' + ctx.classes.length + ' classes, ' +
            ctx.sections.length + ' sections, ' + studentCount + ' students'
        );
        console.log(
            '         academics: ' + attendanceRows + ' attendance rows, ' + homeworkRows +
            ' homework, ' + examStats.exams + ' exams, ' + examStats.papers + ' papers, ' +
            examStats.marks + ' marks'
        );
        console.log(
            '         fees: ' + feeStats.heads + ' heads, ' + feeStats.fees +
            ' student fees, ' + feeStats.payments + ' payments'
        );
        console.log(
            '         timetable: ' + ttStats.periods + ' periods, ' + ttStats.slots +
            ' slots (' + ttStats.withTeacher + ' with teacher)'
        );
        console.log('         notices: ' + noticeCount);
        console.log('         library: ' + libStats.books + ' books, ' + libStats.issues + ' issues');
        console.log(
            '         transport: ' + trStats.vehicles + ' vehicles, ' + trStats.routes + ' routes, ' +
            trStats.stops + ' stops, ' + trStats.riders + ' riders'
        );
        console.log('         admissions: ' + admStats.admissions + ' applications, ' + admStats.logs + ' timeline entries');
        console.log('         website: /site/' + ctx.school.slug + ' (' + siteTheme + ' theme, ' + photoCount + ' photos)');
        console.log('         hr: ' + hrStats.staff + ' staff, ' + hrStats.rows + ' attendance rows, ' + hrStats.leaves + ' leaves');

        lines.push('  ' + def.name + '  [' + def.code + ']');
        lines.push('    School Admin : ' + def.admin[1] + '  / admin123');
        lines.push('    Teacher      : ' + def.teachers[0][1] + '  / teacher123');
        lines.push('    Student app  : student@' + domain + '  / student123');
        lines.push('    Parent app   : parent@' + domain + '  / parent123');
        lines.push('');
    }

    console.log('');
    console.log('  ====== LOGIN CREDENTIALS ======');
    console.log('');
    console.log('  SUPER ADMIN (platform)');
    console.log('    ' + env.seed.adminEmail + '  / ' + env.seed.adminPassword);
    console.log('');
    lines.forEach((l) => console.log(l));
}

try {
    await run();
    process.exit(0);
} catch (err) {
    console.error('[seed] failed:', err);
    process.exit(1);
}
