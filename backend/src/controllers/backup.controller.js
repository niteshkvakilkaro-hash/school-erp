import fs from 'node:fs';
import { BackupRun, User } from '../models/index.js';
import { env } from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { runBackup, isRunning, backupFilePath, nextRunAt, usingFallbackPassword } from '../services/backup/index.js';
import { isConfigured } from '../services/backup/s3.js';
import { mailConfigured } from '../services/mailer.js';
import { logEvent } from '../services/audit.js';

const shape = (r) => ({
    id: r.id,
    trigger: r.trigger,
    status: r.status,
    localDate: r.localDate,
    fileName: r.fileName,
    sizeBytes: r.sizeBytes ? Number(r.sizeBytes) : null,
    dbBytes: r.dbBytes ? Number(r.dbBytes) : null,
    files: r.files,
    sha256: r.sha256,
    remoteStatus: r.remoteStatus,
    remoteKey: r.remoteKey,
    remoteError: r.remoteError,
    emailStatus: r.emailStatus,
    error: r.error,
    downloadable: Boolean(backupFilePath(r)),
    startedBy: r.startedBy?.name || null,
    createdAt: r.createdAt,
    finishedAt: r.finishedAt,
});

export const overview = asyncHandler(async (_req, res) => {
    const rows = await BackupRun.findAll({ include: [{ model: User, as: 'startedBy', attributes: ['name'] }], order: [['id', 'DESC']], limit: 30 });
    const lastOk = await BackupRun.findOne({ where: { status: 'ok' }, order: [['id', 'DESC']] });
    const s3 = env.backup.s3;
    res.json({
        success: true,
        data: {
            running: isRunning(),
            schedule: nextRunAt(),
            lastOk: lastOk ? shape(lastOk) : null,
            config: {
                encryption: usingFallbackPassword() ? 'fallback' : 'password',
                keepDays: env.backup.keepDays,
                cloud: isConfigured(s3) ? { endpoint: new URL(s3.endpoint).host, bucket: s3.bucket, prefix: s3.prefix, keepDays: s3.keepDays } : null,
                reportEmail: env.backup.reportEmail || null,
                mail: mailConfigured() ? 'smtp' : 'not-configured',
            },
            runs: rows.map(shape),
        },
    });
});

/** Abhi backup - background me chalta hai, UI status poll karta hai */
export const start = asyncHandler(async (req, res) => {
    if (isRunning()) throw ApiError.conflict('Ek backup pehle se chal raha hai');
    const p = runBackup({ trigger: 'manual', userId: req.user.id });
    // Pehli galti (jaise "pehle se chal raha") turant batao, baaki background me
    const early = await Promise.race([p.then(() => null, (e) => e), new Promise((r) => setTimeout(() => r(null), 300))]);
    if (early) throw early.status === 409 ? ApiError.conflict(early.message) : early;
    p.catch(() => {});
    res.status(202).json({ success: true, message: 'Backup shuru - 1-2 minute lagenge' });
});

export const download = asyncHandler(async (req, res) => {
    const run = await BackupRun.findByPk(req.params.id);
    const file = backupFilePath(run);
    if (!file) throw ApiError.notFound('Ye backup file server par nahi hai (purani hat gayi ya fail hua tha)');
    logEvent({ action: 'backup.download', module: 'Backup', entity: 'backup', entityId: run.id, schoolId: null, summary: 'Backup download - ' + run.fileName });
    res.set('Content-Type', 'application/octet-stream');
    res.set('Content-Disposition', 'attachment; filename="' + run.fileName + '"');
    res.set('Content-Length', String(fs.statSync(file).size));
    res.set('Cache-Control', 'no-store');
    fs.createReadStream(file).pipe(res);
});
