import { connectDatabase } from '../config/database.js';
import { sequelize } from '../models/index.js';

const alter = !process.argv.includes('--force');

try {
    await connectDatabase();
    await sequelize.sync(alter ? { alter: true } : { force: true });
    console.log(alter ? '[db] tables synced (alter)' : '[db] tables recreated (force)');
    process.exit(0);
} catch (err) {
    console.error('[db] sync failed:', err.message);
    process.exit(1);
}
