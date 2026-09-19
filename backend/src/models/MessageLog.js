import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/** Har bheja (ya roka) gaya message - admin ko dikhta hai ki kya gaya, kya fail hua. */
const MessageLog = sequelize.define(
    'MessageLog',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        event: { type: DataTypes.STRING(30), allowNull: false },
        channel: { type: DataTypes.STRING(20), allowNull: false },
        toPhone: { type: DataTypes.STRING(20) },
        body: { type: DataTypes.STRING(500), allowNull: false },
        status: { type: DataTypes.ENUM('queued', 'sent', 'failed', 'skipped'), allowNull: false, defaultValue: 'queued' },
        providerRef: { type: DataTypes.STRING(120) },
        error: { type: DataTypes.STRING(255) },
        studentId: { type: DataTypes.INTEGER.UNSIGNED },
        userId: { type: DataTypes.INTEGER.UNSIGNED },
        // Ek hi cheez ka message do baar na jaye (e.g. "absent:12:2026-09-19")
        dedupeKey: { type: DataTypes.STRING(120) },
    },
    {
        tableName: 'message_logs',
        updatedAt: false,
        indexes: [{ unique: true, fields: ['school_id', 'dedupe_key'] }, { fields: ['school_id', 'created_at'] }],
    }
);

export default MessageLog;
