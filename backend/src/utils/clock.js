/**
 * School ka local time - server kisi bhi timezone me chale, attendance ki date
 * aur late ka hisaab school ke time se hi hona chahiye.
 */
export const SCHOOL_TZ = process.env.SCHOOL_TZ || 'Asia/Kolkata';

const dateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: SCHOOL_TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const timeFmt = new Intl.DateTimeFormat('en-GB', { timeZone: SCHOOL_TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const dayFmt = new Intl.DateTimeFormat('en-US', { timeZone: SCHOOL_TZ, weekday: 'short' });

/** YYYY-MM-DD school ke timezone me */
export const localDate = (d = new Date()) => dateFmt.format(d);
/** HH:MM school ke timezone me */
export const localTime = (d = new Date()) => timeFmt.format(d);
export const toMinutes = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
};
const DAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
/** 0 = Sunday - date string (YYYY-MM-DD) ka din */
export const weekday = (ymd) => DAYS[dayFmt.format(new Date(ymd + 'T12:00:00Z'))];

/** Do GPS points ke beech meter (haversine). */
export function distanceM(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const rad = (x) => (x * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLng = rad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

/** from..to ke saare din (YYYY-MM-DD), dono shamil. */
export function eachDay(from, to) {
    const out = [];
    const d = new Date(from + 'T12:00:00Z');
    const end = new Date(to + 'T12:00:00Z');
    while (d <= end) {
        out.push(d.toISOString().slice(0, 10));
        d.setUTCDate(d.getUTCDate() + 1);
    }
    return out;
}
