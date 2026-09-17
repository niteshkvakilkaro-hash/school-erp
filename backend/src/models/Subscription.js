import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/** School ka current plan aur uski validity. */
const Subscription = sequelize.define(
    'Subscription',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        planId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        startsOn: { type: DataTypes.DATEONLY, allowNull: false },
        endsOn: { type: DataTypes.DATEONLY, allowNull: false },
        amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
        status: {
            type: DataTypes.ENUM('active', 'expired', 'cancelled'),
            allowNull: false,
            defaultValue: 'active',
        },
        notes: { type: DataTypes.STRING(255) },
    },
    { tableName: 'subscriptions', indexes: [{ fields: ['school_id', 'status'] }] }
);

export default Subscription;
