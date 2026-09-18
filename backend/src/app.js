import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { env, isProd } from './config/env.js';
import routes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';
import { UPLOAD_ROOT } from './utils/upload.js';
import { mountWebApps } from './webApps.js';

const allowedOrigins = env.clientUrl.split(',').map((o) => o.trim());
const LAN_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$/;

const app = express();

app.set('trust proxy', 1);
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        // Website/admin bhi yahin se serve hote hain - maps, YouTube, fonts aur blob (selfie preview, camera) chahiye
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                // expo-camera (web) ka worker jsQR CDN se laata hai
                scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
                styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
                fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
                imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
                mediaSrc: ["'self'", 'blob:'],
                connectSrc: ["'self'"],
                frameSrc: ['https://maps.google.com', 'https://www.google.com', 'https://www.youtube-nocookie.com', 'https://player.vimeo.com'],
                workerSrc: ["'self'", 'blob:'],
                objectSrc: ["'none'"],
                frameAncestors: ["'self'"],
            },
        },
    })
);
app.use(
    cors({
        origin(origin, cb) {
            // Native app / curl origin nahi bhejte
            if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
            // Development me phone ke browser se LAN IP par test karne dein
            if (!isProd && LAN_ORIGIN.test(origin)) return cb(null, true);
            return cb(null, false);
        },
        credentials: true,
    })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Website ki photos - naam random UUID, isliye lamba cache chalega
app.use(
    '/uploads',
    express.static(UPLOAD_ROOT, { index: false, dotfiles: 'deny', maxAge: '30d', immutable: true })
);
app.use(morgan(isProd ? 'combined' : 'dev'));

app.use(
    '/api',
    rateLimit({
        windowMs: 60 * 1000,
        max: 300,
        standardHeaders: true,
        legacyHeaders: false,
    })
);

app.use('/api', routes);

export const webApps = mountWebApps(app);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
