/** Terminal se turant backup: npm run backup:now */
import { connectDatabase, sequelize } from '../config/database.js';
import '../models/index.js';
import { runBackup } from '../services/backup/index.js';

await connectDatabase();
const run = await runBackup({ trigger: 'manual' }).catch((e) => ({ status: 'failed', error: e.message }));
console.log(run.status === 'ok' ? '✓ ' + run.fileName + ' (' + (Number(run.sizeBytes) / 1048576).toFixed(1) + ' MB, cloud: ' + run.remoteStatus + ')' : '✗ ' + run.error);
await sequelize.close();
process.exit(run.status === 'ok' ? 0 : 1);
