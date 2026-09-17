import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { env, isProd } from './config/env.js';
import routes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
    cors({
        origin: env.clientUrl.split(',').map((o) => o.trim()),
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
