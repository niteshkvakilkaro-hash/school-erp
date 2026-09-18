import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/** Admission ki timeline - status badla ya note likha, kisne aur kab. */
const AdmissionLog = sequelize.define(
    'AdmissionLog',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        admissionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        // null = sirf note, status nahi badla
        fromStatus: { type: DataTypes.STRING(20) },
        toStatus: { type: DataTypes.STRING(20) },
        note: { type: DataTypes.TEXT },
        userId: { type: DataTypes.INTEGER.UNSIGNED },
    },
    {
        tableName: 'admission_logs',
        updatedAt: false,
        indexes: [{ fields: ['admission_id'] }],
    }
);

export default AdmissionLog;
