import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const bool = (v, fallback = false) =>
    v === undefined ? fallback : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());

export const env = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT || 5000),
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

    db: {
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT || 3306),
        name: process.env.DB_NAME || 'erpsc_school',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        logging: bool(process.env.DB_LOGGING, false),
    },

    jwt: {
        secret: process.env.JWT_SECRET || 'dev-only-insecure-secret',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },

    // Roz ka backup - details README 'Backup' me
    backup: {
        enabled: bool(process.env.BACKUP_ENABLED, true),
        time: process.env.BACKUP_TIME || '02:00', // school timezone me
        dir: process.env.BACKUP_DIR || '',
        keepDays: Number(process.env.BACKUP_KEEP_DAYS || 14),
        password: process.env.BACKUP_PASSWORD || '',
        mysqldump: process.env.BACKUP_MYSQLDUMP || '',
        mysql: process.env.BACKUP_MYSQL || '',
        reportEmail: process.env.BACKUP_REPORT_EMAIL || '',
        s3: {
            endpoint: process.env.BACKUP_S3_ENDPOINT || '', // R2: https://<account>.r2.cloudflarestorage.com
            region: process.env.BACKUP_S3_REGION || 'auto',
            bucket: process.env.BACKUP_S3_BUCKET || '',
            accessKey: process.env.BACKUP_S3_ACCESS_KEY || '',
            secretKey: process.env.BACKUP_S3_SECRET_KEY || '',
            prefix: process.env.BACKUP_S3_PREFIX || 'erpsc-backups',
            keepDays: Number(process.env.BACKUP_S3_KEEP_DAYS || 30),
        },
    },

    smtp: {
        host: process.env.SMTP_HOST || '',
        port: Number(process.env.SMTP_PORT || 587),
        secure: bool(process.env.SMTP_SECURE, false),
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.MAIL_FROM || process.env.SMTP_USER || '',
    },

    seed: {
        adminName: process.env.SEED_ADMIN_NAME || 'School Admin',
        adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@school.com',
        adminPassword: process.env.SEED_ADMIN_PASSWORD || 'admin123',
    },
};

export const isProd = env.nodeEnv === 'production';
