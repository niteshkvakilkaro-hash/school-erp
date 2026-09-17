import { Student, SchoolClass, Section, Subject, Teacher, User, School } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Mobile app (parent + student) ke endpoints.
 * Yahan tenant scope ke upar ek aur layer hai: user sirf apne (ya apne bachche ke)
 * record tak pahunch sakta hai, poore school ke nahi.
 */

const studentDetail = [
    { model: SchoolClass, as: 'schoolClass', attributes: ['id', 'name', 'level'] },
    { model: Section, as: 'section', attributes: ['id', 'name', 'roomNo'] },
];

/** Jin students ko ye user dekh sakta hai. */
async function accessibleStudents(req) {
    const own = await Student.findAll({
        where: { userId: req.user.id, schoolId: req.schoolId },
        include: studentDetail,
    });
    if (own.length) return own;

    return Student.findAll({
        where: { schoolId: req.schoolId },
        include: [
            ...studentDetail,
            {
                model: User,
                as: 'guardians',
                where: { id: req.user.id },
                attributes: [],
                through: { attributes: [] },
            },
        ],
    });
}

async function assertAccess(req, studentId) {
    const list = await accessibleStudents(req);
    const student = list.find((s) => String(s.id) === String(studentId));
    if (!student) throw ApiError.forbidden('Ye record aapse juda hua nahi hai');
    return student;
}

/** App ka home - student khud ya parent ke bachcho ki list. */
export const myStudents = asyncHandler(async (req, res) => {
    const students = await accessibleStudents(req);

    res.json({
        success: true,
        data: {
            school: req.school
                ? { id: req.school.id, name: req.school.name, code: req.school.code, session: req.school.session }
                : null,
            students: students.map((s) => ({
                id: s.id,
                admissionNo: s.admissionNo,
                name: [s.firstName, s.lastName].filter(Boolean).join(' '),
                rollNo: s.rollNo,
                gender: s.gender,
                dob: s.dob,
                bloodGroup: s.bloodGroup,
                status: s.status,
                className: s.schoolClass?.name || null,
                sectionName: s.section?.name || null,
            })),
        },
    });
});

export const studentProfile = asyncHandler(async (req, res) => {
    const student = await assertAccess(req, req.params.studentId);

    res.json({
        success: true,
        data: {
            id: student.id,
            admissionNo: student.admissionNo,
            firstName: student.firstName,
            lastName: student.lastName,
            name: [student.firstName, student.lastName].filter(Boolean).join(' '),
            gender: student.gender,
            dob: student.dob,
            bloodGroup: student.bloodGroup,
            rollNo: student.rollNo,
            admissionDate: student.admissionDate,
            status: student.status,
            fatherName: student.fatherName,
            motherName: student.motherName,
            guardianPhone: student.guardianPhone,
            address: student.address,
            city: student.city,
            schoolClass: student.schoolClass,
            section: student.section,
        },
    });
});

/** Us student ki class ke subjects + kaunsa teacher padhata hai. */
export const studentSubjects = asyncHandler(async (req, res) => {
    const student = await assertAccess(req, req.params.studentId);

    if (!student.classId) return res.json({ success: true, data: [] });

    const subjects = await Subject.findAll({
        where: { schoolId: req.schoolId, classId: student.classId },
        include: [
            {
                model: Teacher,
                as: 'teacher',
                attributes: ['id', 'employeeNo', 'specialization'],
                include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
            },
        ],
        order: [['name', 'ASC']],
    });

    res.json({
        success: true,
        data: subjects.map((s) => ({
            id: s.id,
            name: s.name,
            code: s.code,
            type: s.type,
            maxMarks: s.maxMarks,
            passMarks: s.passMarks,
            teacherName: s.teacher?.user?.name || null,
        })),
    });
});

/** Class teacher aur section teacher ka contact. */
export const studentTeachers = asyncHandler(async (req, res) => {
    const student = await assertAccess(req, req.params.studentId);

    const teacherInclude = {
        model: Teacher,
        as: 'classTeacher',
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }],
    };

    const cls = student.classId
        ? await SchoolClass.findOne({
              where: { id: student.classId, schoolId: req.schoolId },
              include: [teacherInclude],
          })
        : null;

    const section = student.sectionId
        ? await Section.findOne({
              where: { id: student.sectionId, schoolId: req.schoolId },
              include: [
                  {
                      model: Teacher,
                      as: 'teacher',
                      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }],
                  },
              ],
          })
        : null;

    const out = [];
    if (cls?.classTeacher?.user) {
        out.push({ role: 'Class Teacher', ...cls.classTeacher.user.toJSON() });
    }
    if (section?.teacher?.user && section.teacher.id !== cls?.classTeacher?.id) {
        out.push({ role: 'Section Teacher', ...section.teacher.user.toJSON() });
    }

    res.json({ success: true, data: out });
});

/** App ke "School" tab ke liye. */
export const schoolInfo = asyncHandler(async (req, res) => {
    const school = await School.findByPk(req.schoolId, {
        attributes: ['id', 'name', 'code', 'email', 'phone', 'address', 'city', 'state', 'website', 'session', 'logo'],
    });
    if (!school) throw ApiError.notFound('School not found');
    res.json({ success: true, data: school });
});
