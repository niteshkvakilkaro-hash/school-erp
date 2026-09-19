import crypto from 'node:crypto';
import { env } from '../config/env.js';

/**
 * School ki gateway / SMS keys database me plain text me nahi rakhte.
 * AES-256-GCM - key SECRETS_KEY env se (na ho to JWT secret se derive).
 */
const KEY = crypto.createHash('sha256').update(process.env.SECRETS_KEY || env.jwt.secret + ':erpsc-secrets').digest();

export function encrypt(plain) {
    if (plain === null || plain === undefined || plain === '') return null;
    const iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv('aes-256-gcm', KEY, iv);
    const data = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
    return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), data.toString('base64')].join(':');
}

export function decrypt(box) {
    if (!box) return null;
    try {
        const [v, iv, tag, data] = box.split(':');
        if (v !== 'v1') return null;
        const d = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(iv, 'base64'));
        d.setAuthTag(Buffer.from(tag, 'base64'));
        return Buffer.concat([d.update(Buffer.from(data, 'base64')), d.final()]).toString('utf8');
    } catch {
        return null;
    }
}

/** UI me dikhane ke liye - "••••••ab12" */
export const mask = (s) => (s ? '•'.repeat(6) + String(s).slice(-4) : null);

/** Timing-safe string compare (signature check) */
export function safeEqual(a, b) {
    const x = Buffer.from(String(a || ''));
    const y = Buffer.from(String(b || ''));
    return x.length === y.length && crypto.timingSafeEqual(x, y);
}
