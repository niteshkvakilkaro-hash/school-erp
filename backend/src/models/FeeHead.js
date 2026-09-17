import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const FEE_FREQUENCY = ['one-time', 'monthly', 'quarterly', 'half-yearly', 'annual'];

/**
 * Fee ka ek category - Tuition Fee, Transport Fee, etc.
 * classId null = saari classes par lagta hai.
 */
const FeeHead = sequelize.define(
    'FeeHead',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        name: { type: DataTypes.STRING(100), allowNull: false },
        code: { type: DataTypes.STRING(20), allowNull: false },
        amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
        frequency: {
            type: DataTypes.ENUM(...FEE_FREQUENCY),
            allowNull: false,
            defaultValue: 'annual',
        },
        classId: { type: DataTypes.INTEGER.UNSIGNED },
        // Optional fees (transport) har student par apne aap nahi lagti
        isOptional: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        description: { type: DataTypes.STRING(255) },
        status: {
            type: DataTypes.ENUM('active', 'inactive'),
            allowNull: false,
            defaultValue: 'active',
        },
    },
    {
        tableName: 'fee_heads',
        indexes: [{ unique: true, fields: ['school_id', 'code'] }],
    }
);

export default FeeHead;
