import app from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import './models/index.js';
import { startScheduler } from './services/backup/index.js';

async function start() {
    try {
        await connectDatabase();
        console.log('[db] connected to ' + env.db.name + ' @ ' + env.db.host + ':' + env.db.port);
    } catch (err) {
        console.error('[db] connection failed:', err.message);
        console.error('     XAMPP me MySQL start hai? .env ke DB_* values check kijiye.');
        process.exit(1);
    }

    app.listen(env.port, () => {
        console.log('[api] http://localhost:' + env.port + '/api  (' + env.nodeEnv + ')');
    });
    // Roz ka backup (BACKUP_ENABLED=false se band)
    startScheduler();
}

start();

process.on('unhandledRejection', (reason) => {
    console.error('[fatal] unhandled rejection:', reason);
});
