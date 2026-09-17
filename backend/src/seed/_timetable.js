import { Period, TimetableSlot, Section, Subject } from '../models/index.js';

// [name, start, end, isBreak]
const PERIODS = [
    ['Period 1', '09:00', '09:45', false],
    ['Period 2', '09:45', '10:30', false],
    ['Short Break', '10:30', '10:45', true],
    ['Period 3', '10:45', '11:30', false],
    ['Period 4', '11:30', '12:15', false],
    ['Lunch', '12:15', '13:00', true],
    ['Period 5', '13:00', '13:45', false],
    ['Period 6', '13:45', '14:30', false],
];

const DAYS = [1, 2, 3, 4, 5, 6];

/**
 * Har section ka poora hafta bharta hai. Teacher clash se bachne ke liye ek
 * global map rakhte hain: "day:period" par kaun se teachers busy hain.
 * Jo teacher free na ho, us slot me teacher blank chhod dete hain - galat
 * data banane se behtar hai ki wo khaali dikhe.
 */
export async function seedTimetable(school) {
    const periods = [];
    for (const [i, [name, startTime, endTime, isBreak]] of PERIODS.entries()) {
        periods.push(
            await Period.create({
                schoolId: school.id,
                name,
                startTime,
                endTime,
                sortOrder: i + 1,
                isBreak,
            })
        );
    }

    const teaching = periods.filter((p) => !p.isBreak);
    const sections = await Section.findAll({
        where: { schoolId: school.id },
        attributes: ['id', 'classId', 'name'],
    });

    // day:periodId -> Set of busy teacherIds
    const busy = {};
    const rows = [];

    for (const [si, section] of sections.entries()) {
        const subjects = await Subject.findAll({
            where: { schoolId: school.id, classId: section.classId },
            attributes: ['id', 'teacherId'],
        });
        if (subjects.length === 0) continue;

        for (const day of DAYS) {
            for (const [pi, period] of teaching.entries()) {
                // Rotation me section ka offset bhi lete hain - warna saari sections
                // ek hi period me ek hi subject uthati hain aur teacher clash ho jata hai
                const subject = subjects[(day + pi + si) % subjects.length];
                const key = day + ':' + period.id;
                busy[key] = busy[key] || new Set();

                const teacherId =
                    subject.teacherId && !busy[key].has(subject.teacherId) ? subject.teacherId : null;
                if (teacherId) busy[key].add(teacherId);

                rows.push({
                    schoolId: school.id,
                    classId: section.classId,
                    sectionId: section.id,
                    periodId: period.id,
                    dayOfWeek: day,
                    subjectId: subject.id,
                    teacherId,
                    roomNo: 'R-' + section.classId + section.name,
                });
            }
        }
    }

    for (let i = 0; i < rows.length; i += 500) {
        await TimetableSlot.bulkCreate(rows.slice(i, i + 500), { ignoreDuplicates: true });
    }

    const withTeacher = rows.filter((r) => r.teacherId).length;
    return { periods: periods.length, slots: rows.length, withTeacher };
}
