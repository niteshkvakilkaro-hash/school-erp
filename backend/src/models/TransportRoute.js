import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const TransportRoute = sequelize.define(
    'TransportRoute',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        name: { type: DataTypes.STRING(100), allowNull: false },
        code: { type: DataTypes.STRING(20), allowNull: false },
        vehicleId: { type: DataTypes.INTEGER.UNSIGNED },
        // Mahine ka transport charge
        monthlyFare: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
        description: { type: DataTypes.STRING(255) },
        status: { type: DataTypes.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
    },
    {
        tableName: 'transport_routes',
        indexes: [{ unique: true, fields: ['school_id', 'code'] }],
    }
);

export default TransportRoute;
