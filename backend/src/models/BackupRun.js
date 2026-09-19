import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/** Har backup ka record - platform (Super Admin) ke liye, kisi school ka nahi. */
const BackupRun = sequelize.define(
    'BackupRun',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        trigger: { type: DataTypes.ENUM('auto', 'manual'), allowNull: false },
        status: { type: DataTypes.ENUM('running', 'ok', 'failed'), allowNull: false, defaultValue: 'running' },
        localDate: { type: DataTypes.STRING(10) }, // school timezone ka din - roz ek auto backup
        fileName: { type: DataTypes.STRING(120) },
        sizeBytes: { type: DataTypes.BIGINT.UNSIGNED },
        sha256: { type: DataTypes.STRING(64) },
        dbBytes: { type: DataTypes.BIGINT.UNSIGNED },
        files: { type: DataTypes.INTEGER.UNSIGNED },
        remoteStatus: { type: DataTypes.ENUM('uploaded', 'skipped', 'failed'), allowNull: false, defaultValue: 'skipped' },
        remoteKey: { type: DataTypes.STRING(255) },
        remoteError: { type: DataTypes.STRING(255) },
        emailStatus: { type: DataTypes.STRING(20) },
        error: { type: DataTypes.STRING(500) },
        localDeleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        startedById: { type: DataTypes.INTEGER.UNSIGNED },
        finishedAt: { type: DataTypes.DATE },
    },
    { tableName: 'backup_runs', updatedAt: false, indexes: [{ fields: ['trigger', 'local_date'] }] }
);

export default BackupRun;
