import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * School ka bell schedule - "Period 1: 09:00-09:45", lunch break waghairah.
 * Ye poore school ke liye ek hi hota hai, har class ke liye alag nahi.
 */
const Period = sequelize.define(
    'Period',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        name: { type: DataTypes.STRING(40), allowNull: false },
        startTime: { type: DataTypes.STRING(5), allowNull: false },
        endTime: { type: DataTypes.STRING(5), allowNull: false },
        // Din me kaunse number par aata hai
        sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        // Break/lunch me koi subject assign nahi hota
        isBreak: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
        tableName: 'periods',
        indexes: [
            { unique: true, fields: ['school_id', 'name'] },
            { fields: ['school_id', 'sort_order'] },
        ],
    }
);

export default Period;
