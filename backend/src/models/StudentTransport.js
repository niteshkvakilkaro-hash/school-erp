import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/** Student kis route aur kis stop se aata-jaata hai. Ek student = ek assignment. */
const StudentTransport = sequelize.define(
    'StudentTransport',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        studentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
        routeId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        stopId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        startDate: { type: DataTypes.DATEONLY },
    },
    {
        tableName: 'student_transport',
        indexes: [{ fields: ['school_id', 'route_id'] }],
    }
);

export default StudentTransport;
