import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/** School ki bus/van. Ek vehicle ek waqt me ek hi route par chalta hai. */
const Vehicle = sequelize.define(
    'Vehicle',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        regNo: { type: DataTypes.STRING(20), allowNull: false },
        type: { type: DataTypes.ENUM('bus', 'van', 'mini-bus', 'auto'), allowNull: false, defaultValue: 'bus' },
        capacity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 40 },
        driverName: { type: DataTypes.STRING(120) },
        driverPhone: { type: DataTypes.STRING(20) },
        helperName: { type: DataTypes.STRING(120) },
        helperPhone: { type: DataTypes.STRING(20) },
        // Fitness / insurance expiry - reminder ke kaam aata hai
        insuranceExpiry: { type: DataTypes.DATEONLY },
        status: { type: DataTypes.ENUM('active', 'maintenance', 'inactive'), allowNull: false, defaultValue: 'active' },
    },
    {
        tableName: 'vehicles',
        indexes: [{ unique: true, fields: ['school_id', 'reg_no'] }],
    }
);

export default Vehicle;
