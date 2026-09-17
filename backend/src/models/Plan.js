import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/** SaaS pricing plan - super admin manage karta hai. */
const Plan = sequelize.define(
    'Plan',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(60), allowNull: false, unique: true },
        code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
        pricePerMonth: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
        // 0 ka matlab unlimited
        maxStudents: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        maxTeachers: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        features: { type: DataTypes.TEXT },
        status: {
            type: DataTypes.ENUM('active', 'inactive'),
            allowNull: false,
            defaultValue: 'active',
        },
    },
    { tableName: 'plans' }
);

export default Plan;
