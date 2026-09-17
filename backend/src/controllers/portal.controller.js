import { Op } from 'sequelize';
import { Student, SchoolClass, Section, Subject, Teacher, User, School, Exam } from '../models/index.js';
import { scopedWhere } from '../utils/tenant.js';
import { studentSummary } from './attendance.controller.js';
import { forStudent } from './homework.controller.js';
import { studentResult } from './exam.controller.js';
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

/* ---------------- Attendance / homework / results (mobile app) ---------------- */

/** Student ki attendance summary + recent records. */
export const studentAttendance = asyncHandler(async (req, res) => {
    const student = await assertAccess(req, req.params.studentId);
    const summary = await studentSummary(req, student.id, req.query);
    res.json({ success: true, data: summary });
});

/** Us student ki class/section ka homework. */
export const studentHomework = asyncHandler(async (req, res) => {
    const student = await assertAccess(req, req.params.studentId);
    const items = await forStudent(req, student, { limit: 30 });
    res.json({ success: true, data: items });
});

/**
 * Sirf wahi exams jinke results publish ho chuke hain - parents ko
 * adhoora ya bina check kiya result nahi dikhna chahiye.
 */
export const studentExams = asyncHandler(async (req, res) => {
    const student = await assertAccess(req, req.params.studentId);

    const where = scopedWhere(req, { resultsPublished: true });
    if (student.classId) {
        where[Op.or] = [{ classId: null }, { classId: student.classId }];
    }

    const exams = await Exam.findAll({
        where,
        attributes: ['id', 'name', 'type', 'startDate', 'endDate'],
        order: [['startDate', 'DESC']],
        limit: 12,
    });

    res.json({ success: true, data: exams });
});

export const studentResultCard = asyncHandler(async (req, res) => {
    const student = await assertAccess(req, req.params.studentId);
    const result = await studentResult(req, req.params.examId, student.id, { onlyPublished: true });
    res.json({ success: true, data: result });
});
