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

    seed: {
        adminName: process.env.SEED_ADMIN_NAME || 'School Admin',
        adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@school.com',
        adminPassword: process.env.SEED_ADMIN_PASSWORD || 'admin123',
    },
};

export const isProd = env.nodeEnv === 'production';
