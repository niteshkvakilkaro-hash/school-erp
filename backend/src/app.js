import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { env, isProd } from './config/env.js';
import routes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';

const allowedOrigins = env.clientUrl.split(',').map((o) => o.trim());
const LAN_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$/;

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
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

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
