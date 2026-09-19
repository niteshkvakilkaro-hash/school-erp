import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../../config/env.js';

/** backend/ folder */
export const BACKEND_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
/** Backup files - git me nahi jaate. BACKUP_DIR se server par alag disk de sakte hain. */
export const BACKUP_ROOT = env.backup.dir ? path.resolve(env.backup.dir) : path.join(BACKEND_ROOT, 'backups');
/** Archive me jaane wale folders (backend/ ke andar) */
export const DATA_DIRS = ['uploads', 'private'];

/** mysqldump / mysql binary - env, phir XAMPP, phir PATH */
export function mysqlBin(name) {
    const fromEnv = name === 'mysqldump' ? env.backup.mysqldump : env.backup.mysql;
    if (fromEnv) return fromEnv;
    const xampp = 'C:/xampp/mysql/bin/' + name + '.exe';
    if (process.platform === 'win32' && fs.existsSync(xampp)) return xampp;
    return name;
}
