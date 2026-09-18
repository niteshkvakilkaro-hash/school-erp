import { Op } from 'sequelize';
import { HrSetting, StaffAttendance, LeaveRequest, User, Role } from '../models/index.js';
import { savePrivateImage } from '../utils/upload.js';
import { localDate, weekday, eachDay } from '../utils/clock.js';

// School ka GPS point (demo)
const POINTS = {
    'SPS-INDORE': [22.7244, 75.8839],
    'GVA-BHOPAL': [23.2332, 77.4343],
};

const addDays = (ymd, n) => {
    const d = new Date(ymd + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};
/** School (IST) ke time se Date */
const at = (ymd, hhmm) => new Date(ymd + 'T' + hhmm + ':00+05:30');
const pad = (n) => String(n).padStart(2, '0');
const hm = (mins) => pad(Math.floor(mins / 60)) + ':' + pad(mins % 60);
// ~meter ko degree me (chhoti doori ke liye kaafi)
const nudge = (deg, m) => deg + m / 111000;

/** Demo selfie - chehre jaisa gol aakar aur initials, "DEMO" likha. */
function selfie(name, hue) {
    const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640">
      <rect width="480" height="640" fill="hsl(${hue},35%,82%)"/>
      <circle cx="240" cy="250" r="120" fill="hsl(${hue},30%,62%)"/>
      <rect x="90" y="400" width="300" height="260" rx="140" fill="hsl(${hue},30%,48%)"/>
      <text x="240" y="275" text-anchor="middle" font-family="Arial" font-size="80" font-weight="700" fill="#fff">${initials}</text>
      <text x="240" y="60" text-anchor="middle" font-family="Arial" font-size="26" font-weight="700" fill="#000" opacity="0.45" letter-spacing="3">DEMO SELFIE</text>
    </svg>`);
}

export async function seedHr(school) {
    const [lat, lng] = POINTS[school.code] || [22.72, 75.86];
    await HrSetting.create({
        schoolId: school.id,
        latitude: lat,
        longitude: lng,
        radiusM: 200,
        officeStart: '08:00',
        officeEnd: '14:30',
        graceMinutes: 15,
        halfDayMinutes: 240,
        weeklyOff: '0',
    });

    const staff = await User.findAll({
        where: { schoolId: school.id, status: 'active' },
        include: [{ model: Role, as: 'role', where: { slug: { [Op.notIn]: ['student', 'parent'] } } }],
        order: [['id', 'ASC']],
    });
    const teachers = staff.filter((u) => u.role.slug === 'teacher');
    const today = localDate();

    // ---- Leaves ----
    const leaves = [];
    let lastWeekLeave = null;
    if (teachers[1]) {
        // Pichhle hafte 2 din - approved
        let from = addDays(today, -8);
        while (weekday(from) === 0 || weekday(addDays(from, 1)) === 0) from = addDays(from, -1);
        lastWeekLeave = { userId: teachers[1].id, from, to: addDays(from, 1) };
        leaves.push({ userId: teachers[1].id, type: 'sick', fromDate: from, toDate: addDays(from, 1), days: 2, reason: 'Viral fever - doctor ne 2 din aaram bola', status: 'approved', reviewedById: staff[0].id, reviewedAt: new Date() });
    }
    if (teachers[2] || teachers[0]) {
        const u = teachers[2] || teachers[0];
        let from = addDays(today, 5);
        while (weekday(from) === 0) from = addDays(from, 1);
        leaves.push({ userId: u.id, type: 'casual', fromDate: from, toDate: from, days: 1, reason: 'Bhai ki shaadi hai', status: 'pending' });
    }
    if (teachers[3]) {
        const from = addDays(today, 12);
        leaves.push({ userId: teachers[3].id, type: 'earned', fromDate: from, toDate: addDays(from, 4), days: 5, reason: 'Family trip', status: 'rejected', reviewedById: staff[0].id, reviewNote: 'Exam ke din hain - baad me plan kijiye', reviewedAt: new Date() });
    }
    for (const l of leaves) await LeaveRequest.create({ schoolId: school.id, ...l });

    // ---- Pichhle 20 din ----
    let rows = 0;
    const days = eachDay(addDays(today, -20), addDays(today, -1)).filter((d) => weekday(d) !== 0);
    for (const [ui, u] of staff.entries()) {
        for (const [di, d] of days.entries()) {
            if (lastWeekLeave && u.id === lastWeekLeave.userId && d >= lastWeekLeave.from && d <= lastWeekLeave.to) continue;
            const seed = (ui * 7 + di * 13) % 23;
            if (seed === 5) continue; // kabhi-kabhi absent
            const inMin = 7 * 60 + 40 + ((ui * 11 + di * 7) % 40); // 07:40 - 08:19
            const half = seed === 9;
            const outMin = half ? inMin + 180 : 14 * 60 + 25 + ((ui + di) % 30);
            const outside = seed === 14;
            const status = half ? 'half-day' : inMin > 8 * 60 + 15 ? 'late' : 'present';
            const photo = di === days.length - 1 ? await savePrivateImage(selfie(u.name, (ui * 67) % 360), school.id, 'attendance') : null;
            await StaffAttendance.create({
                schoolId: school.id,
                userId: u.id,
                date: d,
                status,
                inAt: at(d, hm(inMin)),
                inLat: outside ? nudge(lat, 1400) : nudge(lat, ((ui * 17 + di) % 60) - 30),
                inLng: lng,
                inAccuracy: 12 + ((ui + di) % 20),
                inDistance: outside ? 1400 : Math.abs(((ui * 17 + di) % 60) - 30),
                inOutside: outside,
                inPhoto: photo,
                outAt: at(d, hm(outMin)),
                outLat: nudge(lat, 10),
                outLng: lng,
                outAccuracy: 15,
                outDistance: 10,
                workMinutes: outMin - inMin,
                source: 'app',
            });
            rows++;
        }
    }

    // ---- Aaj - kuch aa chuke, ek late + bahar se, baaki abhi nahi ----
    if (weekday(today) !== 0) {
        const plan = [
            [0, '07:48', 20, false],
            [1, '07:55', 45, false],
            [2, '08:26', 1250, true],
            [3, '08:05', 60, false],
        ];
        for (const [idx, time, dist, outside] of plan) {
            const u = staff[idx];
            if (!u) continue;
            await StaffAttendance.create({
                schoolId: school.id,
                userId: u.id,
                date: today,
                status: time > '08:15' ? 'late' : 'present',
                inAt: at(today, time),
                inLat: nudge(lat, dist),
                inLng: lng,
                inAccuracy: 18,
                inDistance: dist,
                inOutside: outside,
                inPhoto: await savePrivateImage(selfie(u.name, (idx * 67) % 360), school.id, 'attendance'),
                source: 'app',
            });
            rows++;
        }
    }
    return { rows, leaves: leaves.length, staff: staff.length };
}
