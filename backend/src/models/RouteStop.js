import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/** Route ka ek stop - kahan se kitne baje uthana, kitne baje chhodna. */
const RouteStop = sequelize.define(
    'RouteStop',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        routeId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        name: { type: DataTypes.STRING(120), allowNull: false },
        pickupTime: { type: DataTypes.STRING(5) },
        dropTime: { type: DataTypes.STRING(5) },
        sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
        tableName: 'route_stops',
        indexes: [{ unique: true, fields: ['route_id', 'name'] }],
    }
);

export default RouteStop;
