import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { Writable } from 'node:stream';
import * as tar from 'tar';
import { Op } from 'sequelize';
import { env } from '../../config/env.js';
import { BackupRun, School, Student } from '../../models/index.js';
import { localDate, localTime, toMinutes } from '../../utils/clock.js';
import { sendMail } from '../mailer.js';
import { encryptFile, decryptStream } from './crypto.js';
import * as s3 from './s3.js';
import { BACKEND_ROOT, BACKUP_ROOT, DATA_DIRS, mysqlBin } from './paths.js';

const WORK = 'backup-work'; // backend/ ke andar - archive me "backup-work/database.sql"
const RUNNING_TIMEOUT_MS = 3 * 60 * 60 * 1000;

/** BACKUP_PASSWORD na ho to JWT secret se (tab restore ke liye wahi .env chahiye) */
export const backupPassword = () => env.backup.password || 'jwt:' + env.jwt.secret;
export const usingFallbackPassword = () => !env.backup.password;

const mb = (n) => (n / 1024 / 1024).toFixed(1) + ' MB';

function runMysqldump(outFile) {
    const args = [
        '--host=' + env.db.host,
        '--port=' + env.db.port,
        '--user=' + env.db.user,
        '--single-transaction',
        '--quick',
        '--routines',
        '--triggers',
        '--default-character-set=utf8mb4',
        '--result-file=' + outFile,
        env.db.name,
    ];
    return new Promise((resolve, reject) => {
        // Password command line par nahi (process list me dikhta) - env se
        const p = spawn(mysqlBin('mysqldump'), args, { env: { ...process.env, MYSQL_PWD: env.db.password }, windowsHide: true });
        let err = '';
        p.stderr.on('data', (d) => (err += d));
        p.on('error', (e) => reject(new Error('mysqldump chal nahi paaya (' + e.message + ') - BACKUP_MYSQLDUMP set kijiye')));
        p.on('close', (code) => (code === 0 ? resolve() : reject(new Error('mysqldump fail: ' + err.trim().slice(0, 300)))));
    });
}

/** Backup sahi khulta hai? decrypt + gunzip + tar list - database.sql hona hi chahiye. */
export async function verifyBackup(file, password = backupPassword()) {
    const entries = [];
    await pipeline(
        decryptStream(file, password),
        zlib.createGunzip(),
        new tar.Parser({ onReadEntry: (e) => { entries.push(e.path); e.resume(); } })
    );
    if (!entries.includes(WORK + '/database.sql')) throw new Error('Backup me database.sql nahi mila');
    return entries;
}

const stamp = () => {
    const d = new Date();
    return localDate(d).replace(/-/g, '') + '-' + localTime(d).replace(':', '');
};

let running = false;

/**
 * Poora backup: DB dump + uploads + selfies -> tar.gz -> encrypt -> verify ->
 * cloud (agar set) -> purane hatao -> report email.
 */
export async function runBackup({ trigger = 'manual', userId = null } = {}) {
    if (running) throw Object.assign(new Error('Ek backup pehle se chal raha hai'), { status: 409 });
    running = true; // await se pehle - do request ek saath andar na aayein
    let run;
    try {
        // Dusre process (ya crash se pehle) ka chalta hua backup
        const other = await BackupRun.findOne({ where: { status: 'running', createdAt: { [Op.gt]: new Date(Date.now() - RUNNING_TIMEOUT_MS) } } });
        if (other) throw Object.assign(new Error('Ek backup pehle se chal raha hai'), { status: 409 });
        run = await BackupRun.create({ trigger, localDate: localDate(), startedById: userId });
    } catch (e) {
        running = false;
        throw e;
    }
    const work = path.join(BACKEND_ROOT, WORK);
    const tmpTar = path.join(BACKUP_ROOT, '.tmp-' + run.id + '.tar.gz');
    try {
        fs.mkdirSync(BACKUP_ROOT, { recursive: true });
        fs.rmSync(work, { recursive: true, force: true });
        fs.mkdirSync(work, { recursive: true });

        const sqlFile = path.join(work, 'database.sql');
        await runMysqldump(sqlFile);
        const dbBytes = fs.statSync(sqlFile).size;
        fs.writeFileSync(
            path.join(work, 'manifest.json'),
            JSON.stringify(
                {
                    app: 'erpsc',
                    format: 1,
                    createdAt: new Date().toISOString(),
                    database: env.db.name,
                    schools: await School.count(),
                    students: await Student.count(),
                    dirs: DATA_DIRS,
                },
                null,
                2
            )
        );

        const include = [WORK].concat(DATA_DIRS.filter((d) => fs.existsSync(path.join(BACKEND_ROOT, d))));
        let files = 0;
        await tar.create({ gzip: { level: 6 }, cwd: BACKEND_ROOT, file: tmpTar, portable: true, filter: (p, st) => (st.isFile() && files++, true) }, include);

        const fileName = 'erpsc-' + stamp() + '-' + run.id + '.erpscbk';
        const finalPath = path.join(BACKUP_ROOT, fileName);
        const { sha256, size } = await encryptFile(tmpTar, finalPath, backupPassword());
        fs.rmSync(tmpTar, { force: true });
        await verifyBackup(finalPath);
        await run.update({ fileName, sizeBytes: size, sha256, dbBytes, files });

        if (s3.isConfigured(env.backup.s3)) {
            const key = env.backup.s3.prefix.replace(/\/+$/, '') + '/' + fileName;
            try {
                await s3.putFile(env.backup.s3, key, finalPath, sha256);
                await run.update({ remoteStatus: 'uploaded', remoteKey: key });
            } catch (e) {
                await run.update({ remoteStatus: 'failed', remoteError: String(e.message).slice(0, 250) });
            }
        }
        await run.update({ status: 'ok', finishedAt: new Date() });
    } catch (e) {
        await run.update({ status: 'failed', error: String(e.message || e).slice(0, 500), finishedAt: new Date() });
        fs.rmSync(tmpTar, { force: true });
    } finally {
        fs.rmSync(work, { recursive: true, force: true });
        running = false;
    }

    const pruned = await prune().catch((e) => ({ error: e.message }));
    await report(run, pruned);
    return run.reload();
}

/** Purane backup hatao - local BACKUP_KEEP_DAYS, cloud BACKUP_S3_KEEP_DAYS. Sabse naye 3 hamesha rahte hain. */
export async function prune() {
    const out = { local: 0, remote: 0 };
    const cutoff = Date.now() - env.backup.keepDays * 86400000;
    const keep = new Set((await BackupRun.findAll({ where: { status: 'ok' }, order: [['id', 'DESC']], limit: 3 })).map((r) => r.fileName));
    const old = await BackupRun.findAll({ where: { status: 'ok', localDeleted: false, createdAt: { [Op.lt]: new Date(cutoff) } } });
    for (const r of old) {
        if (keep.has(r.fileName)) continue;
        fs.rmSync(path.join(BACKUP_ROOT, r.fileName), { force: true });
        await r.update({ localDeleted: true });
        out.local++;
    }
    const cfg = env.backup.s3;
    if (s3.isConfigured(cfg)) {
        const rcut = Date.now() - cfg.keepDays * 86400000;
        const objs = (await s3.list(cfg, cfg.prefix.replace(/\/+$/, '') + '/')).filter((o) => o.key.endsWith('.erpscbk'));
        objs.sort((a, b) => b.lastModified - a.lastModified);
        for (const o of objs.slice(3)) {
            if (o.lastModified.getTime() < rcut) {
                await s3.remove(cfg, o.key);
                out.remote++;
            }
        }
    }
    return out;
}

async function report(run, pruned) {
    // Roz wale ki report hamesha; haath se liye backup ki sirf fail par
    if (run.trigger === 'manual' && run.status === 'ok') return;
    const ok = run.status === 'ok';
    const lines = ok
        ? [
              'Backup ho gaya.',
              '',
              'File: ' + run.fileName,
              'Size: ' + mb(Number(run.sizeBytes)) + ' (database ' + mb(Number(run.dbBytes)) + ', ' + run.files + ' files)',
              'SHA-256: ' + run.sha256,
              'Cloud: ' + (run.remoteStatus === 'uploaded' ? 'upload ho gaya (' + run.remoteKey + ')' : run.remoteStatus === 'failed' ? 'FAIL - ' + run.remoteError : 'set nahi hai - sirf server par copy'),
              'Purane hataye: server ' + (pruned.local ?? 0) + ', cloud ' + (pruned.remote ?? 0),
          ]
        : ['Backup FAIL hua!', '', 'Wajah: ' + run.error, '', 'Super Admin panel -> Backups me "Abhi backup lijiye" se dobara try kijiye.'];
    if (ok && usingFallbackPassword()) lines.push('', 'Dhyan: BACKUP_PASSWORD set nahi hai - backup kholne ke liye isi server ki .env (JWT_SECRET) chahiye hogi.');
    const subject = (ok ? (run.remoteStatus === 'failed' ? '⚠ ERPSC backup (cloud fail) ' : 'ERPSC backup OK ') : '❌ ERPSC backup FAIL ') + run.localDate + (ok ? ' - ' + mb(Number(run.sizeBytes)) : '');
    const r = await sendMail({ to: env.backup.reportEmail, subject, text: lines.join('\n') });
    await run.update({ emailStatus: r.status });
}

/* ---------------- Roz ka schedule ---------------- */

let timer;
/**
 * Har minute dekhta hai: school ke time me BACKUP_TIME nikal gaya aur aaj ka auto
 * backup nahi hua -> ab karo. Server raat ko band tha to chalu hote hi ho jayega.
 */
export function startScheduler() {
    if (!env.backup.enabled || timer) return;
    const tick = async () => {
        try {
            if (running) return;
            if (toMinutes(localTime()) < toMinutes(env.backup.time)) return;
            const today = localDate();
            const done = await BackupRun.findOne({ where: { trigger: 'auto', localDate: today, status: { [Op.in]: ['ok', 'running'] } } });
            // Fail hua ho to din me 3 baar tak dobara
            const fails = await BackupRun.count({ where: { trigger: 'auto', localDate: today, status: 'failed' } });
            if (done || fails >= 3) return;
            await runBackup({ trigger: 'auto' });
        } catch (e) {
            if (e.status !== 409) console.error('[backup]', e.message);
        }
    };
    timer = setInterval(tick, 60 * 1000);
    timer.unref();
    setTimeout(tick, 15 * 1000).unref();
}

export function nextRunAt() {
    if (!env.backup.enabled) return null;
    return { time: env.backup.time, tz: process.env.SCHOOL_TZ || 'Asia/Kolkata' };
}

export const isRunning = () => running;
export { BACKUP_ROOT };

/** Download ke liye file ka path (sirf backups/ ke andar, naam DB se) */
export function backupFilePath(run) {
    if (!run?.fileName || run.localDeleted) return null;
    const p = path.join(BACKUP_ROOT, path.basename(run.fileName));
    return fs.existsSync(p) ? p : null;
}

/** Test / restore script ke liye: stream ko khali kar do */
export const sink = () => new Writable({ write: (_c, _e, cb) => cb() });
