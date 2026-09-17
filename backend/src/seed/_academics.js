import {
    Attendance, Homework, Exam, ExamSubject, Mark, Student, Subject,
} from '../models/index.js';

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
};

/**
 * Pichhle 20 working days ki attendance. Har student ka apna pattern hai
 * (roll ke hisaab se) taki report me variety dikhe - sab 100% nahi.
 */
export async function seedAttendance(school, classes, sections, users) {
    const students = await Student.findAll({
        where: { schoolId: school.id, status: 'active' },
        attributes: ['id', 'classId', 'sectionId', 'rollNo'],
    });
    if (students.length === 0) return 0;

    const markedById = users.admin.id;
    const rows = [];
    let day = new Date();

    let added = 0;
    while (added < 20) {
        day = addDays(day, -1);
        // Sunday chhod do
        if (day.getDay() === 0) continue;
        added++;

        const date = iso(day);
        for (const s of students) {
            const roll = Number(s.rollNo) || 1;
            // Deterministic "random" - har run par same data
            const seed = (roll * 7 + added * 13 + s.id) % 100;

            let status = 'present';
            if (seed < 6) status = 'absent';
            else if (seed < 10) status = 'leave';
            else if (seed < 13) status = 'half-day';

            rows.push({
                schoolId: school.id,
                studentId: s.id,
                classId: s.classId,
                sectionId: s.sectionId,
                date,
                status,
                markedById,
            });
        }
    }

    // Bade batch me daalne se seeding tez rehti hai
    for (let i = 0; i < rows.length; i += 500) {
        await Attendance.bulkCreate(rows.slice(i, i + 500), { ignoreDuplicates: true });
    }
    return rows.length;
}

const HOMEWORK = [
    ['Chapter 3 exercises', 'Page 45 ke saare sums notebook me kijiye.', 'MATH'],
    ['Essay: My favourite book', '200 shabdo me essay likhiye.', 'ENG'],
    ['Leaf diagram', 'Patte ka labelled diagram banaiye.', 'SCI'],
    ['Map work', 'Bharat ke map me rajya bhariye.', 'SST'],
    ['Kavita yaad kijiye', 'Paath 4 ki kavita yaad karke aaiye.', 'HIN'],
];

export async function seedHomework(school, classes, teachers) {
    let count = 0;

    for (const cls of classes) {
        const subjects = await Subject.findAll({
            where: { schoolId: school.id, classId: cls.id },
            attributes: ['id', 'code'],
        });

        for (const [idx, [title, description, codePrefix]] of HOMEWORK.entries()) {
            const subject = subjects.find((s) => s.code.startsWith(codePrefix));
            if (!subject) continue;

            const assigned = addDays(new Date(), -(idx * 3 + 2));
            await Homework.create({
                schoolId: school.id,
                classId: cls.id,
                sectionId: null,
                subjectId: subject.id,
                teacherId: teachers[idx % teachers.length].id,
                title,
                description,
                assignedDate: iso(assigned),
                dueDate: iso(addDays(assigned, 5)),
                // Purana homework band, naya khula
                status: idx > 2 ? 'closed' : 'open',
            });
            count++;
        }
    }
    return count;
}

/**
 * Har class ke liye do exams: ek ho chuka (marks + published result) aur
 * ek aane wala (sirf datesheet). Isse UI ke dono states test ho jaate hain.
 */
export async function seedExams(school, classes, users) {
    let exams = 0;
    let papers = 0;
    let marks = 0;

    for (const cls of classes) {
        const subjects = await Subject.findAll({
            where: { schoolId: school.id, classId: cls.id },
            attributes: ['id'],
            limit: 5,
        });
        if (subjects.length === 0) continue;

        const students = await Student.findAll({
            where: { schoolId: school.id, classId: cls.id, status: 'active' },
            attributes: ['id', 'rollNo'],
        });

        // ---- Ho chuka exam ----
        const pastStart = addDays(new Date(), -40);
        const past = await Exam.create({
            schoolId: school.id,
            name: 'Unit Test 1',
            type: 'unit-test',
            classId: cls.id,
            startDate: iso(pastStart),
            endDate: iso(addDays(pastStart, subjects.length - 1)),
            resultsPublished: true,
            description: 'Pehla unit test',
        });
        exams++;

        for (const [i, subject] of subjects.entries()) {
            const paper = await ExamSubject.create({
                schoolId: school.id,
                examId: past.id,
                subjectId: subject.id,
                examDate: iso(addDays(pastStart, i)),
                startTime: '10:00',
                endTime: '12:00',
                maxMarks: 50,
                passMarks: 17,
            });
            papers++;

            const rows = students.map((s) => {
                const roll = Number(s.rollNo) || 1;
                const seed = (roll * 11 + i * 17 + s.id) % 100;
                // Thode students absent, baaki 18-50 ke beech
                const absent = seed < 4;
                return {
                    schoolId: school.id,
                    examSubjectId: paper.id,
                    studentId: s.id,
                    marksObtained: absent ? null : 18 + (seed % 33),
                    isAbsent: absent,
                    enteredById: users.admin.id,
                };
            });
            if (rows.length) {
                await Mark.bulkCreate(rows, { ignoreDuplicates: true });
                marks += rows.length;
            }
        }

        // ---- Aane wala exam (sirf datesheet) ----
        const futureStart = addDays(new Date(), 12);
        const upcoming = await Exam.create({
            schoolId: school.id,
            name: 'Mid Term Exam',
            type: 'mid-term',
            classId: cls.id,
            startDate: iso(futureStart),
            endDate: iso(addDays(futureStart, subjects.length - 1)),
            description: 'Half yearly examination',
        });
        exams++;

        for (const [i, subject] of subjects.entries()) {
            await ExamSubject.create({
                schoolId: school.id,
                examId: upcoming.id,
                subjectId: subject.id,
                examDate: iso(addDays(futureStart, i)),
                startTime: '09:30',
                endTime: '12:30',
                maxMarks: 100,
                passMarks: 33,
            });
            papers++;
        }
    }

    return { exams, papers, marks };
}
