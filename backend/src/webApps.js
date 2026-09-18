import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const WEB_DIST = path.join(ROOT, 'frontend', 'dist');
const APP_DIST = path.join(ROOT, 'mobile', 'dist-web');

/**
 * Build ho chuke ho to API ke saath hi admin panel + website (`/`) aur mobile
 * app ka web version (`/app`) bhi serve karo - ek hi link/port par sab chale
 * (demo tunnel ya chhota server). Dev me Vite/Expo apne port par chalte hain.
 */
export function mountWebApps(app) {
    const mounted = [];
    const html = (file) => (req, res) => res.set('Cache-Control', 'no-cache').sendFile(file);

    if (fs.existsSync(path.join(APP_DIST, 'index.html'))) {
        app.use('/app', express.static(APP_DIST, { index: false, maxAge: '7d' }));
        app.get(/^\/app(\/.*)?$/, html(path.join(APP_DIST, 'index.html')));
        mounted.push('/app');
    }
    if (fs.existsSync(path.join(WEB_DIST, 'index.html'))) {
        app.use(express.static(WEB_DIST, { index: false, maxAge: '7d' }));
        // SPA - /api aur /uploads chhod kar baaki sab index.html
        app.get(/^\/(?!api\/|api$|uploads\/).*/, html(path.join(WEB_DIST, 'index.html')));
        mounted.push('/');
    }
    return mounted;
}
