import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Har API request ka "kaun kar raha hai" - DB hooks isi se activity log me
 * user / school / IP likhte hain, bina har controller me req pass kiye.
 */
const als = new AsyncLocalStorage();

export const auditContext = () => als.getStore();

export function auditContextMiddleware(req, _res, next) {
    als.run({ user: null, schoolId: null, ip: req.ip, ua: String(req.headers['user-agent'] || '').slice(0, 200) }, next);
}

/** Login / OTP jaisi jagah jahan token nahi hota - actor khud set karo */
export function setAuditActor(user, schoolId) {
    const s = als.getStore();
    if (!s) return;
    s.user = user;
    if (schoolId !== undefined) s.schoolId = schoolId;
}
