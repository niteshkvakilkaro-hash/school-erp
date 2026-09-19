import fs from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { BACKUP_ROOT } from './backup/paths.js';

export const mailConfigured = () => Boolean(env.smtp.host && env.smtp.from);

let transport;
const getTransport = () =>
    (transport ||= nodemailer.createTransport({
        host: env.smtp.host,
        port: env.smtp.port,
        secure: env.smtp.secure,
        auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    }));

/**
 * Email bhejo. SMTP set nahi ho to mail `backups/outbox.log` me likh dete hain
 * (demo / local me dekh sakte hain ki kya jaata) - status 'not-configured'.
 */
export async function sendMail({ to, subject, text }) {
    if (!to) return { status: 'no-recipient' };
    if (!mailConfigured()) {
        fs.mkdirSync(BACKUP_ROOT, { recursive: true });
        fs.appendFileSync(path.join(BACKUP_ROOT, 'outbox.log'), ['-----', new Date().toISOString(), 'To: ' + to, 'Subject: ' + subject, '', text, ''].join('\n'));
        return { status: 'not-configured' };
    }
    try {
        const info = await getTransport().sendMail({ from: env.smtp.from, to, subject, text });
        return { status: 'sent', id: info.messageId };
    } catch (err) {
        return { status: 'failed', error: String(err.message).slice(0, 250) };
    }
}
