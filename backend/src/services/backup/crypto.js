import crypto from 'node:crypto';
import fs from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';

/**
 * Backup file format: "ERPSCBK1" | salt(16) | iv(12) | AES-256-GCM ciphertext | tag(16)
 * Key = scrypt(BACKUP_PASSWORD, salt). Password ke bina file kisi kaam ki nahi.
 */
const MAGIC = Buffer.from('ERPSCBK1');
const HEAD = MAGIC.length + 16 + 12;
const TAG = 16;

const deriveKey = (password, salt) => crypto.scryptSync(password, salt, 32, { N: 2 ** 14, r: 8, p: 1 });

/** src ko encrypt karke dst me likhta hai; sha256 (poori final file ka) aur size lautata hai. */
export async function encryptFile(src, dst, password) {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(password, salt), iv);
    const hash = crypto.createHash('sha256');
    const out = fs.createWriteStream(dst, { mode: 0o600 });
    const header = Buffer.concat([MAGIC, salt, iv]);
    hash.update(header);
    out.write(header);
    const tee = new Transform({
        transform(chunk, _e, cb) {
            hash.update(chunk);
            cb(null, chunk);
        },
    });
    await pipeline(fs.createReadStream(src), cipher, tee, out, { end: false }).catch(async (e) => {
        out.destroy();
        throw e;
    });
    const tag = cipher.getAuthTag();
    hash.update(tag);
    await new Promise((res, rej) => out.end(tag, (e) => (e ? rej(e) : res())));
    return { sha256: hash.digest('hex'), size: fs.statSync(dst).size };
}

/** Decrypt stream - galat password / chhedi hui file par stream error deti hai (GCM tag). */
export function decryptStream(file, password) {
    const size = fs.statSync(file).size;
    if (size < HEAD + TAG) throw new Error('Backup file adhuri hai');
    const fd = fs.openSync(file, 'r');
    const head = Buffer.alloc(HEAD);
    const tag = Buffer.alloc(TAG);
    fs.readSync(fd, head, 0, HEAD, 0);
    fs.readSync(fd, tag, 0, TAG, size - TAG);
    fs.closeSync(fd);
    if (!head.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('Ye ERPSC backup file nahi hai');
    const salt = head.subarray(MAGIC.length, MAGIC.length + 16);
    const iv = head.subarray(MAGIC.length + 16, HEAD);
    const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(password, salt), iv);
    decipher.setAuthTag(tag);
    return fs.createReadStream(file, { start: HEAD, end: size - TAG - 1 }).pipe(decipher);
}
