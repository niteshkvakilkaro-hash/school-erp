/**
 * Demo / tunnel ke liye sab kuch build karta hai taaki backend (port 5000)
 * akela hi admin panel, website aur mobile app ka web version serve kare:
 *   /            admin panel + school website (/site/<slug>)
 *   /app         mobile app (web)
 *   /api         API
 * Phir: npm run demo:start  aur  npm run demo:tunnel
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const run = (cmd, args, cwd, env = {}) => {
    console.log('\n> ' + cmd + ' ' + args.join(' ') + '   (' + path.relative(root, cwd || root) + ')');
    const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: true, env: { ...process.env, ...env } });
    if (r.status !== 0) process.exit(r.status || 1);
};

run('npm', ['run', 'build'], path.join(root, 'frontend'));
run('npx', ['expo', 'export', '--platform', 'web', '--output-dir', 'dist-web', '--clear'], path.join(root, 'mobile'), {
    EXPO_BASE_URL: '/app',
    // Build me server ka address fix mat karo - web version usi site ka /api use karta hai
    EXPO_PUBLIC_API_URL: '',
});
console.log('\nBuild ready. Ab: npm run demo:start   (aur doosre terminal me)   npm run demo:tunnel');
