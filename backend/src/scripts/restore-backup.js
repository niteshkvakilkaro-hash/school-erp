/**
 * Backup wapas laana (server par, terminal se):
 *
 *   npm run backup:restore -- <file.erpscbk> --db erpsc_check          # alag DB me - pehle jaanch
 *   npm run backup:restore -- <file.erpscbk> --yes --files             # LIVE DB + photos/selfies wapas
 *   npm run backup:restore -- <file.erpscbk> --verify                  # sirf check, kuch nahi badalta
 *
 * Password: BACKUP_PASSWORD (.env) ya --password. Restore se pehle API band kar dijiye.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import * as tar from 'tar';
import { env } from '../config/env.js';
import { decryptStream } from '../services/backup/crypto.js';
import { backupPassword, verifyBackup } from '../services/backup/index.js';
import { BACKEND_ROOT, BACKUP_ROOT, DATA_DIRS, mysqlBin } from '../services/backup/paths.js';

const args = process.argv.slice(2);
const flag = (n) => args.includes('--' + n);
const opt = (n) => (args.includes('--' + n) ? args[args.indexOf('--' + n) + 1] : undefined);
const file = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--db' && args[args.indexOf(a) - 1] !== '--password');
const password = opt('password') || backupPassword();
const db = opt('db') || env.db.name;

const die = (m) => {
    console.error('\n✗ ' + m + '\n');
    process.exit(1);
};

function mysql(argsList, stdinFile) {
    return new Promise((resolve, reject) => {
        const p = spawn(mysqlBin('mysql'), ['--host=' + env.db.host, '--port=' + env.db.port, '--user=' + env.db.user, '--default-character-set=utf8mb4', ...argsList], {
            env: { ...process.env, MYSQL_PWD: env.db.password },
            windowsHide: true,
            stdio: [stdinFile ? 'pipe' : 'ignore', 'inherit', 'pipe'],
        });
        let err = '';
        p.stderr.on('data', (d) => (err += d));
        p.on('error', reject);
        p.on('close', (c) => (c === 0 ? resolve() : reject(new Error(err.trim() || 'mysql exit ' + c))));
        if (stdinFile) fs.createReadStream(stdinFile).pipe(p.stdin);
    });
}

async function main() {
    if (!file) die('Backup file ka path dijiye. Madad: file ke upar comment dekhiye.');
    if (!fs.existsSync(file)) die('File nahi mili: ' + file);
    if (!/^[A-Za-z0-9_]+$/.test(db)) die('DB naam me sirf letters, number, _');

    console.log('→ Jaanch: ' + path.basename(file));
    const entries = await verifyBackup(file, password).catch((e) => die('Backup khul nahi paaya (galat password ya kharab file): ' + e.message));
    console.log('  theek hai - ' + entries.length + ' entries');
    if (flag('verify')) return console.log('\n✓ Backup sahi hai (kuch badla nahi)\n');

    if (db === env.db.name && !flag('yes')) die('Ye LIVE database "' + db + '" ko badal dega. Pakka ho to --yes lagaiye, ya pehle --db <naya_naam> se jaanchiye.');

    const tmp = path.join(BACKUP_ROOT, '.restore-' + Date.now());
    fs.mkdirSync(tmp, { recursive: true });
    try {
        await pipeline(decryptStream(file, password), zlib.createGunzip(), tar.x({ cwd: tmp, strict: true }));
        const manifest = JSON.parse(fs.readFileSync(path.join(tmp, 'backup-work', 'manifest.json'), 'utf8'));
        console.log('  backup ' + manifest.createdAt + ' - ' + manifest.schools + ' schools, ' + manifest.students + ' students');

        console.log('→ Database "' + db + '" me daal rahe hain...');
        await mysql(['-e', 'CREATE DATABASE IF NOT EXISTS `' + db + '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci']);
        await mysql([db], path.join(tmp, 'backup-work', 'database.sql'));
        console.log('  database ho gaya');

        if (flag('files')) {
            const ts = new Date().toISOString().replace(/[:.]/g, '-');
            for (const d of DATA_DIRS) {
                const src = path.join(tmp, d);
                if (!fs.existsSync(src)) continue;
                const dst = path.join(BACKEND_ROOT, d);
                // Purana folder hatate nahi - side me rakh dete hain
                if (fs.existsSync(dst)) fs.renameSync(dst, dst + '.before-restore-' + ts);
                fs.cpSync(src, dst, { recursive: true });
                console.log('  ' + d + '/ wapas (purana: ' + d + '.before-restore-' + ts + ')');
            }
        }
        console.log('\n✓ Restore ho gaya' + (flag('files') ? '' : ' (photos/selfies ke liye --files)') + '\n');
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }
}

main().catch((e) => die(e.message));
