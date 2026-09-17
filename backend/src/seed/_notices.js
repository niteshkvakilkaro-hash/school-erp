import { Notice, SchoolClass } from '../models/index.js';

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
};

// [title, body, category, audience, priority, publishOffset, expiryOffset, eventOffset]
const NOTICES = [
    ['Annual Sports Day', 'Saare students Annual Sports Day me hissa lein. Practice roz 3 baje se.', 'event', 'all', 'high', -5, 20, 18],
    ['Parent Teacher Meeting', 'PTM 15 tareekh ko hogi. Sabhi parents se anurodh hai ki samay par aayein.', 'academic', 'parents', 'high', -3, 12, 10],
    ['Holiday Notice', 'School 10 tareekh ko band rahega - local holiday.', 'holiday', 'all', 'medium', -8, 5, 4],
    ['Exam Schedule Released', 'Mid Term exam ka datesheet jaari kar diya gaya hai. Timetable dekh lijiye.', 'exam', 'students', 'high', -2, 25, null],
    ['Fee Reminder', 'Pending fees 30 tareekh tak jama kar dijiye.', 'fee', 'parents', 'medium', -1, 15, null],
    ['Staff Meeting', 'Sabhi teachers ke liye staff meeting shukrawar 4 baje.', 'general', 'staff', 'medium', -1, 6, 5],
    ['Library Week', 'Library week ke dauran naye books ka collection dekh sakte hain.', 'general', 'all', 'low', -12, -2, null],
    ['Science Exhibition', 'Class ke students apne projects 20 tareekh tak jama karein.', 'academic', 'class', 'medium', -4, 18, 16],
];

/**
 * Demo notices - alag audiences aur alag states (live, scheduled, expired)
 * taaki UI ke saare cases dikhein.
 */
export async function seedNotices(school, users) {
    const firstClass = await SchoolClass.findOne({
        where: { schoolId: school.id },
        order: [['level', 'ASC']],
        attributes: ['id'],
    });

    let count = 0;
    for (const [title, body, category, audience, priority, pubOff, expOff, evtOff] of NOTICES) {
        await Notice.create({
            schoolId: school.id,
            title,
            body,
            category,
            audience,
            priority,
            classId: audience === 'class' ? firstClass?.id || null : null,
            publishOn: iso(addDays(new Date(), pubOff)),
            expiresOn: expOff === null ? null : iso(addDays(new Date(), expOff)),
            eventDate: evtOff === null ? null : iso(addDays(new Date(), evtOff)),
            createdById: users.admin.id,
        });
        count++;
    }

    // Ek scheduled (abhi live nahi) aur ek draft - dono states test karne ke liye
    await Notice.create({
        schoolId: school.id,
        title: 'Summer Camp Registration',
        body: 'Summer camp ke liye registration agle hafte se shuru hoga.',
        category: 'event',
        audience: 'all',
        priority: 'low',
        publishOn: iso(addDays(new Date(), 7)),
        eventDate: iso(addDays(new Date(), 30)),
        createdById: users.admin.id,
    });
    await Notice.create({
        schoolId: school.id,
        title: 'Uniform Policy Update (draft)',
        body: 'Naye session se uniform policy me badlaav - abhi finalise nahi hua.',
        category: 'general',
        audience: 'all',
        priority: 'low',
        publishOn: iso(new Date()),
        isPublished: false,
        createdById: users.admin.id,
    });

    return count + 2;
}
