/**
 * Poore system ka permission catalog. Seeder isi se `permissions` table bharta hai
 * aur UI "Roles & Permissions" screen par isi ko module-wise group karke dikhata hai.
 *
 * Naya module add karo -> yahan permissions likho -> `npm run db:seed` -> ho gaya.
 */
export const PERMISSIONS = [
    // ---- Platform (sirf Super Admin) ----
    { slug: 'platform.dashboard.view', module: 'Platform', label: 'Platform dashboard dekhna', scope: 'platform' },
    { slug: 'platform.schools.view', module: 'Platform', label: 'Schools ki list dekhna', scope: 'platform' },
    { slug: 'platform.schools.manage', module: 'Platform', label: 'School banana / edit / suspend', scope: 'platform' },
    { slug: 'platform.plans.manage', module: 'Platform', label: 'Plans aur subscriptions manage karna', scope: 'platform' },

    // ---- School ----
    { slug: 'dashboard.view', module: 'Dashboard', label: 'School dashboard dekhna' },

    { slug: 'students.view', module: 'Students', label: 'Students dekhna' },
    { slug: 'students.create', module: 'Students', label: 'Naya admission karna' },
    { slug: 'students.update', module: 'Students', label: 'Student edit karna' },
    { slug: 'students.delete', module: 'Students', label: 'Student delete karna' },

    { slug: 'admissions.view', module: 'Admissions', label: 'Enquiries aur applications dekhna' },
    { slug: 'admissions.manage', module: 'Admissions', label: 'Enquiry banana, stage badalna, notes/follow-up' },
    { slug: 'admissions.admit', module: 'Admissions', label: 'Approved application ko student banana' },

    { slug: 'teachers.view', module: 'Teachers', label: 'Teachers dekhna' },
    { slug: 'teachers.create', module: 'Teachers', label: 'Teacher add karna' },
    { slug: 'teachers.update', module: 'Teachers', label: 'Teacher edit karna' },
    { slug: 'teachers.delete', module: 'Teachers', label: 'Teacher delete karna' },

    { slug: 'classes.view', module: 'Classes', label: 'Classes dekhna' },
    { slug: 'classes.manage', module: 'Classes', label: 'Class banana / edit / delete' },

    { slug: 'sections.view', module: 'Sections', label: 'Sections dekhna' },
    { slug: 'sections.manage', module: 'Sections', label: 'Section banana / edit / delete' },

    { slug: 'subjects.view', module: 'Subjects', label: 'Subjects dekhna' },
    { slug: 'subjects.manage', module: 'Subjects', label: 'Subject banana / edit / delete' },


    { slug: 'timetable.view', module: 'Timetable', label: 'Timetable dekhna' },
    { slug: 'timetable.manage', module: 'Timetable', label: 'Periods aur timetable set karna' },

    { slug: 'attendance.view', module: 'Attendance', label: 'Attendance dekhna' },
    { slug: 'attendance.mark', module: 'Attendance', label: 'Attendance mark karna' },
    { slug: 'attendance.report', module: 'Attendance', label: 'Attendance reports dekhna' },

    { slug: 'homework.view', module: 'Homework', label: 'Homework dekhna' },
    { slug: 'homework.manage', module: 'Homework', label: 'Homework dena / edit / delete' },

    { slug: 'exams.view', module: 'Exams', label: 'Exams aur datesheet dekhna' },
    { slug: 'exams.manage', module: 'Exams', label: 'Exam banana aur datesheet set karna' },
    { slug: 'exams.marks', module: 'Exams', label: 'Marks bharna' },
    { slug: 'exams.publish', module: 'Exams', label: 'Results publish karna' },

    { slug: 'fees.view', module: 'Fees', label: 'Fees aur dues dekhna' },
    { slug: 'fees.manage', module: 'Fees', label: 'Fee heads banana aur students par lagana' },
    { slug: 'fees.collect', module: 'Fees', label: 'Payment lena aur receipt banana' },
    { slug: 'fees.report', module: 'Fees', label: 'Collection reports dekhna' },

    { slug: 'library.view', module: 'Library', label: 'Library books dekhna' },
    { slug: 'library.manage', module: 'Library', label: 'Books add / edit / delete' },
    { slug: 'library.issue', module: 'Library', label: 'Book issue aur return karna' },

    { slug: 'transport.view', module: 'Transport', label: 'Routes, vehicles aur riders dekhna' },
    { slug: 'transport.manage', module: 'Transport', label: 'Route, vehicle, stop banana aur students assign karna' },

    { slug: 'notices.view', module: 'Notices', label: 'Notices dekhna' },
    { slug: 'notices.manage', module: 'Notices', label: 'Notice banana / edit / delete' },

    { slug: 'users.view', module: 'Users', label: 'School ke user accounts dekhna' },
    { slug: 'users.manage', module: 'Users', label: 'User banana / role badalna / delete' },

    { slug: 'roles.view', module: 'Roles', label: 'Roles dekhna' },
    { slug: 'roles.manage', module: 'Roles', label: 'Role banana aur permissions set karna' },

    { slug: 'school.settings.view', module: 'School', label: 'School profile dekhna' },
    { slug: 'school.settings.update', module: 'School', label: 'School profile edit karna' },

    { slug: 'website.manage', module: 'Website', label: 'School website ka content aur theme badalna' },

    { slug: 'hr.self', module: 'HR', label: 'App se apni attendance (selfie + location) aur leave' },
    { slug: 'hr.view', module: 'HR', label: 'Staff ki live attendance, register aur leaves dekhna' },
    { slug: 'hr.manage', module: 'HR', label: 'Attendance sudharna, leave approve karna, HR settings' },

    { slug: 'sessions.manage', module: 'Session', label: 'Naya session shuru karna - promotion, pass-out, undo' },

    { slug: 'messages.view', module: 'Messages', label: 'SMS / WhatsApp ka record dekhna' },
    { slug: 'messages.manage', module: 'Messages', label: 'SMS / WhatsApp setup aur test message' },

    // ---- Portal (mobile app) ----
    { slug: 'portal.self.view', module: 'Portal', label: 'Apna student record dekhna' },
    { slug: 'portal.child.view', module: 'Portal', label: 'Apne bachche ka record dekhna' },
];

export const PERMISSION_SLUGS = PERMISSIONS.map((p) => p.slug);

const schoolOnly = (slugs) => slugs.filter((s) => !s.startsWith('platform.'));

/**
 * Har naye school me ye roles automatically ban jaate hain.
 * School Admin inhe baad me apni marzi se edit kar sakta hai.
 */
export const SYSTEM_ROLES = [
    {
        slug: 'super-admin',
        name: 'Super Admin',
        scope: 'platform',
        description: 'Poora SaaS platform - saare schools, plans aur billing',
        permissions: PERMISSION_SLUGS,
    },
    {
        slug: 'school-admin',
        name: 'School Admin',
        scope: 'school',
        description: 'Apne school ka sab kuch',
        permissions: schoolOnly(PERMISSION_SLUGS).filter((s) => !s.startsWith('portal.')),
    },
    {
        slug: 'principal',
        name: 'Principal',
        scope: 'school',
        description: 'Sab kuch dekh sakte hain, students edit kar sakte hain',
        permissions: ['hr.self', 'hr.view', 'hr.manage', 'sessions.manage',
            'dashboard.view',
            'students.view',
            'students.update',
            'admissions.view',
            'admissions.manage',
            'admissions.admit',
            'website.manage',
            'teachers.view',
            'classes.view',
            'sections.view',
            'subjects.view',
            'users.view',
            'roles.view',
            'school.settings.view',
            'timetable.view',
            'notices.view',
            'notices.manage',
            'library.view',
            'transport.view',
            'attendance.view',
            'attendance.report',
            'homework.view',
            'exams.view',
            'exams.publish',
            'fees.view',
            'fees.report',
            'messages.view',
        ],
    },
    {
        slug: 'teacher',
        name: 'Teacher',
        scope: 'school',
        description: 'Apni classes ke students aur academics',
        permissions: ['hr.self', 
            'dashboard.view',
            'students.view',
            'students.create',
            'students.update',
            'classes.view',
            'sections.view',
            'subjects.view',
            'timetable.view',
            'notices.view',
            'notices.manage',
            'library.view',
            'attendance.view',
            'attendance.mark',
            'attendance.report',
            'homework.view',
            'homework.manage',
            'exams.view',
            'exams.marks',
        ],
    },
    {
        slug: 'accountant',
        name: 'Accountant',
        scope: 'school',
        description: 'Fees collection, dues aur reports',
        permissions: ['hr.self', 
            'dashboard.view',
            'students.view',
            'classes.view',
            'sections.view',
            'attendance.view',
            'notices.view',
            'transport.view',
            'fees.view',
            'fees.manage',
            'fees.collect',
            'fees.report',
        ],
    },
    {
        slug: 'librarian',
        name: 'Librarian',
        scope: 'school',
        description: 'Library - books, issue, return aur fines',
        permissions: ['hr.self', 
            'dashboard.view',
            'students.view',
            'classes.view',
            'notices.view',
            'library.view',
            'library.manage',
            'library.issue',
        ],
    },
    {
        slug: 'transport-manager',
        name: 'Transport Manager',
        scope: 'school',
        description: 'Buses, routes, stops aur kaunsa student kis bus me',
        permissions: ['hr.self', 'dashboard.view', 'students.view', 'classes.view', 'notices.view', 'transport.view', 'transport.manage'],
    },
    {
        slug: 'front-office',
        name: 'Front Office',
        scope: 'school',
        description: 'Admission enquiries, follow-up aur interview schedule',
        permissions: ['hr.self', 
            'dashboard.view',
            'students.view',
            'classes.view',
            'sections.view',
            'notices.view',
            'admissions.view',
            'admissions.manage',
        ],
    },
    {
        slug: 'student',
        name: 'Student',
        scope: 'school',
        portalOnly: true,
        description: 'Mobile app - apna record',
        permissions: ['portal.self.view', 'notices.view'],
    },
    {
        slug: 'parent',
        name: 'Parent',
        scope: 'school',
        portalOnly: true,
        description: 'Mobile app - apne bachcho ka record',
        permissions: ['portal.child.view', 'notices.view'],
    },
];

export const SCHOOL_ROLE_TEMPLATES = SYSTEM_ROLES.filter((r) => r.scope === 'school');
