import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * Activity log - kisne, kab, kya badla. Sirf likha jaata hai: edit / delete ka
 * koi API nahi. schoolId null = platform (Super Admin) ka kaam.
 */
const AuditLog = sequelize.define(
    'AuditLog',
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED },
        userId: { type: DataTypes.INTEGER.UNSIGNED },
        // Naam / role us waqt ka - user baad me delete ho jaye to bhi pata rahe
        userName: { type: DataTypes.STRING(120) },
        userRole: { type: DataTypes.STRING(60) },
        action: { type: DataTypes.STRING(60), allowNull: false }, // student.update, fee_payment.delete, auth.login
        module: { type: DataTypes.STRING(30), allowNull: false },
        entity: { type: DataTypes.STRING(40) },
        entityId: { type: DataTypes.STRING(40) },
        summary: { type: DataTypes.STRING(500), allowNull: false },
        changes: {
            type: DataTypes.TEXT,
            get() {
                const v = this.getDataValue('changes');
                try {
                    return v ? JSON.parse(v) : null;
                } catch {
                    return null;
                }
            },
            set(v) {
                this.setDataValue('changes', v ? JSON.stringify(v) : null);
            },
        },
        ip: { type: DataTypes.STRING(45) },
        userAgent: { type: DataTypes.STRING(200) },
    },
    {
        tableName: 'audit_logs',
        updatedAt: false,
        indexes: [{ fields: ['school_id', 'created_at'] }, { fields: ['school_id', 'entity', 'entity_id'] }, { fields: ['school_id', 'user_id'] }],
    }
);

export default AuditLog;
