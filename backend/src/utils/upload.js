import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import sharp from 'sharp';
import ApiError from './ApiError.js';

/** backend/uploads - src ke bahar, taaki nodemon restart na kare aur git me na jaye. */
export const UPLOAD_ROOT = fileURLToPath(new URL('../../uploads', import.meta.url));

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

const multerSingle = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_BYTES, files: 1 },
    fileFilter: (_req, file, cb) => {
        if (ALLOWED.includes(file.mimetype)) return cb(null, true);
        cb(ApiError.badRequest('Sirf JPG, PNG ya WebP photo chalegi'));
    },
}).single('file');

/** multer ki errors ko hamare ApiError format me badalta hai. */
export function uploadSingle(req, res, next) {
    multerSingle(req, res, (err) => {
        if (!err) return next();
        if (err instanceof ApiError) return next(err);
        if (err.code === 'LIMIT_FILE_SIZE') return next(ApiError.badRequest('Photo 8 MB se chhoti honi chahiye'));
        return next(ApiError.badRequest('Upload nahi ho paaya: ' + err.message));
    });
}

// Kis kaam ki photo kitni badi rakhni hai (width px)
const SIZES = { slide: 2000, gallery: 1600, logo: 512, principal: 640 };
const THUMB = 520;

/**
 * Photo ko sahi disha me ghumata hai, size chhota karke WebP banata hai aur
 * EXIF (GPS location waghairah) hata deta hai. Jo file image hi nahi hai wo
 * yahin fail ho jati hai.
 */
export async function saveImage(buffer, schoolId, kind) {
    let meta;
    try {
        meta = await sharp(buffer, { failOn: 'error' }).metadata();
    } catch {
        throw ApiError.badRequest('Ye file sahi photo nahi hai');
    }
    if (!meta.width || !meta.height) throw ApiError.badRequest('Ye file sahi photo nahi hai');
    if (kind === 'slide' && meta.width < 900) {
        throw ApiError.badRequest('Slider ke liye kam se kam 900px chaudi photo chahiye (ye ' + meta.width + 'px hai)');
    }

    const dir = path.join(UPLOAD_ROOT, 'schools', String(schoolId));
    await fs.mkdir(dir, { recursive: true });
    const name = crypto.randomUUID();
    const rel = (f) => '/uploads/schools/' + schoolId + '/' + f;

    const main = await sharp(buffer)
        .rotate()
        .resize({ width: SIZES[kind] || 1600, withoutEnlargement: true })
        .webp({ quality: kind === 'logo' ? 90 : 80 })
        .toBuffer({ resolveWithObject: true });
    await fs.writeFile(path.join(dir, name + '.webp'), main.data);

    let thumbUrl = null;
    if (kind === 'gallery' || kind === 'slide') {
        const thumb = await sharp(buffer).rotate().resize({ width: THUMB, withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
        await fs.writeFile(path.join(dir, name + '-t.webp'), thumb);
        thumbUrl = rel(name + '-t.webp');
    }

    return {
        url: rel(name + '.webp'),
        thumbUrl,
        width: main.info.width,
        height: main.info.height,
        bytes: main.info.size,
    };
}

/** Sirf apne uploads folder ki files delete karta hai - bahar ka path aaye to ignore. */
export async function removeFiles(...urls) {
    for (const url of urls) {
        if (!url || !url.startsWith('/uploads/')) continue;
        const abs = path.resolve(UPLOAD_ROOT, '.' + url.slice('/uploads'.length));
        if (!abs.startsWith(UPLOAD_ROOT + path.sep)) continue;
        await fs.unlink(abs).catch(() => {});
    }
}
