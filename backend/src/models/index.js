import { sequelize } from '../config/database.js';
import School from './School.js';
import Plan from './Plan.js';
import Subscription from './Subscription.js';
import Permission from './Permission.js';
import Role from './Role.js';
import RolePermission from './RolePermission.js';
import User from './User.js';
import Teacher from './Teacher.js';
import Student from './Student.js';
import StudentGuardian from './StudentGuardian.js';
import SchoolClass from './SchoolClass.js';
import Section from './Section.js';
import Subject from './Subject.js';
import Attendance from './Attendance.js';
import Homework from './Homework.js';
import Exam from './Exam.js';
import ExamSubject from './ExamSubject.js';
import Mark from './Mark.js';
import FeeHead from './FeeHead.js';
import StudentFee from './StudentFee.js';
import FeePayment from './FeePayment.js';
import Period from './Period.js';
import TimetableSlot from './TimetableSlot.js';
import Notice from './Notice.js';

/* ---------------- SaaS / tenancy ---------------- */

// Har tenant-scoped model School se judta hai. School delete hone par uska
// poora data cascade me hat jata hai.
const TENANT_MODELS = [
    User, Teacher, Student, StudentGuardian, SchoolClass, Section, Subject,
    Role, Subscription, Attendance, Homework, Exam, ExamSubject, Mark,
    FeeHead, StudentFee, FeePayment, Period, TimetableSlot, Notice,
];
for (const Model of TENANT_MODELS) {
    School.hasMany(Model, { foreignKey: 'schoolId', onDelete: 'CASCADE' });
    Model.belongsTo(School, { foreignKey: 'schoolId', as: 'school' });
}

Plan.hasMany(Subscription, { foreignKey: 'planId', as: 'subscriptions' });
Subscription.belongsTo(Plan, { foreignKey: 'planId', as: 'plan' });

/* ---------------- RBAC ---------------- */

Role.belongsToMany(Permission, {
    through: RolePermission,
    foreignKey: 'roleId',
    otherKey: 'permissionId',
    as: 'permissions',
});
Permission.belongsToMany(Role, {
    through: RolePermission,
    foreignKey: 'permissionId',
    otherKey: 'roleId',
    as: 'roles',
});

Role.hasMany(User, { foreignKey: 'roleId', as: 'users' });
User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });

/* ---------------- Profiles ---------------- */

User.hasOne(Teacher, { foreignKey: 'userId', as: 'teacherProfile', onDelete: 'CASCADE' });
Teacher.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(Student, { foreignKey: 'userId', as: 'studentProfile', onDelete: 'SET NULL' });
Student.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Parent login <-> bachche (many-to-many)
User.belongsToMany(Student, {
    through: StudentGuardian,
    foreignKey: 'userId',
    otherKey: 'studentId',
    as: 'children',
});
Student.belongsToMany(User, {
    through: StudentGuardian,
    foreignKey: 'studentId',
    otherKey: 'userId',
    as: 'guardians',
});
StudentGuardian.belongsTo(User, { foreignKey: 'userId', as: 'user' });
StudentGuardian.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });

/* ---------------- Academics ---------------- */

SchoolClass.hasMany(Section, { foreignKey: 'classId', as: 'sections', onDelete: 'CASCADE' });
Section.belongsTo(SchoolClass, { foreignKey: 'classId', as: 'schoolClass' });

SchoolClass.belongsTo(Teacher, { foreignKey: 'classTeacherId', as: 'classTeacher' });
Teacher.hasMany(SchoolClass, { foreignKey: 'classTeacherId', as: 'classesLed' });

Section.belongsTo(Teacher, { foreignKey: 'teacherId', as: 'teacher' });
Teacher.hasMany(Section, { foreignKey: 'teacherId', as: 'sections' });

SchoolClass.hasMany(Subject, { foreignKey: 'classId', as: 'subjects' });
Subject.belongsTo(SchoolClass, { foreignKey: 'classId', as: 'schoolClass' });

Teacher.hasMany(Subject, { foreignKey: 'teacherId', as: 'subjects' });
Subject.belongsTo(Teacher, { foreignKey: 'teacherId', as: 'teacher' });

SchoolClass.hasMany(Student, { foreignKey: 'classId', as: 'students' });
Student.belongsTo(SchoolClass, { foreignKey: 'classId', as: 'schoolClass' });

Section.hasMany(Student, { foreignKey: 'sectionId', as: 'students' });
Student.belongsTo(Section, { foreignKey: 'sectionId', as: 'section' });

/* ---------------- Attendance ---------------- */

Student.hasMany(Attendance, { foreignKey: 'studentId', as: 'attendance', onDelete: 'CASCADE' });
Attendance.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });
Attendance.belongsTo(SchoolClass, { foreignKey: 'classId', as: 'schoolClass' });
Attendance.belongsTo(Section, { foreignKey: 'sectionId', as: 'section' });
Attendance.belongsTo(User, { foreignKey: 'markedById', as: 'markedBy' });

/* ---------------- Homework ---------------- */

SchoolClass.hasMany(Homework, { foreignKey: 'classId', as: 'homework', onDelete: 'CASCADE' });
Homework.belongsTo(SchoolClass, { foreignKey: 'classId', as: 'schoolClass' });
Homework.belongsTo(Section, { foreignKey: 'sectionId', as: 'section' });
Homework.belongsTo(Subject, { foreignKey: 'subjectId', as: 'subject' });
Homework.belongsTo(Teacher, { foreignKey: 'teacherId', as: 'teacher' });
Teacher.hasMany(Homework, { foreignKey: 'teacherId', as: 'homework' });

/* ---------------- Exams & marks ---------------- */

Exam.belongsTo(SchoolClass, { foreignKey: 'classId', as: 'schoolClass' });
SchoolClass.hasMany(Exam, { foreignKey: 'classId', as: 'exams' });

Exam.hasMany(ExamSubject, { foreignKey: 'examId', as: 'schedule', onDelete: 'CASCADE' });
ExamSubject.belongsTo(Exam, { foreignKey: 'examId', as: 'exam' });
ExamSubject.belongsTo(Subject, { foreignKey: 'subjectId', as: 'subject' });
Subject.hasMany(ExamSubject, { foreignKey: 'subjectId', as: 'examSubjects' });

ExamSubject.hasMany(Mark, { foreignKey: 'examSubjectId', as: 'marks', onDelete: 'CASCADE' });
Mark.belongsTo(ExamSubject, { foreignKey: 'examSubjectId', as: 'examSubject' });

Student.hasMany(Mark, { foreignKey: 'studentId', as: 'marks', onDelete: 'CASCADE' });
Mark.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });
Mark.belongsTo(User, { foreignKey: 'enteredById', as: 'enteredBy' });

/* ---------------- Fees ---------------- */

FeeHead.belongsTo(SchoolClass, { foreignKey: 'classId', as: 'schoolClass' });
SchoolClass.hasMany(FeeHead, { foreignKey: 'classId', as: 'feeHeads' });

FeeHead.hasMany(StudentFee, { foreignKey: 'feeHeadId', as: 'studentFees', onDelete: 'CASCADE' });
StudentFee.belongsTo(FeeHead, { foreignKey: 'feeHeadId', as: 'feeHead' });

Student.hasMany(StudentFee, { foreignKey: 'studentId', as: 'fees', onDelete: 'CASCADE' });
StudentFee.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });

StudentFee.hasMany(FeePayment, { foreignKey: 'studentFeeId', as: 'payments', onDelete: 'CASCADE' });
FeePayment.belongsTo(StudentFee, { foreignKey: 'studentFeeId', as: 'studentFee' });

Student.hasMany(FeePayment, { foreignKey: 'studentId', as: 'payments', onDelete: 'CASCADE' });
FeePayment.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });
FeePayment.belongsTo(User, { foreignKey: 'collectedById', as: 'collectedBy' });

/* ---------------- Timetable ---------------- */

Period.hasMany(TimetableSlot, { foreignKey: 'periodId', as: 'slots', onDelete: 'CASCADE' });
TimetableSlot.belongsTo(Period, { foreignKey: 'periodId', as: 'period' });

SchoolClass.hasMany(TimetableSlot, { foreignKey: 'classId', as: 'timetable', onDelete: 'CASCADE' });
TimetableSlot.belongsTo(SchoolClass, { foreignKey: 'classId', as: 'schoolClass' });

Section.hasMany(TimetableSlot, { foreignKey: 'sectionId', as: 'timetable', onDelete: 'CASCADE' });
TimetableSlot.belongsTo(Section, { foreignKey: 'sectionId', as: 'section' });

Subject.hasMany(TimetableSlot, { foreignKey: 'subjectId', as: 'slots', onDelete: 'CASCADE' });
TimetableSlot.belongsTo(Subject, { foreignKey: 'subjectId', as: 'subject' });

Teacher.hasMany(TimetableSlot, { foreignKey: 'teacherId', as: 'slots' });
TimetableSlot.belongsTo(Teacher, { foreignKey: 'teacherId', as: 'teacher' });

/* ---------------- Notices ---------------- */

Notice.belongsTo(SchoolClass, { foreignKey: 'classId', as: 'schoolClass' });
Notice.belongsTo(Section, { foreignKey: 'sectionId', as: 'section' });
Notice.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });

export {
    sequelize,
    School,
    Plan,
    Subscription,
    Permission,
    Role,
    RolePermission,
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
    FeeHead,
    StudentFee,
    FeePayment,
    Period,
    TimetableSlot,
    Notice,
};
