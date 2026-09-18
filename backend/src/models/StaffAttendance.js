import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const STAFF_STATUSES = ['present', 'late', 'half-day', 'absent', 'leave'];

const point = (p) => ({
    [p + 'At']: { type: DataTypes.DATE },
    [p + 'Lat']: { type: DataTypes.DECIMAL(10, 7) },
    [p + 'Lng']: { type: DataTypes.DECIMAL(10, 7) },
    // GPS ki accuracy (meter) - phone batata hai
    [p + 'Accuracy']: { type: DataTypes.INTEGER.UNSIGNED },
    // School ke point se doori (meter)
    [p + 'Distance']: { type: DataTypes.INTEGER.UNSIGNED },
    [p + 'Outside']: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    // Android "mock location" app pakda gaya
    [p + 'Mocked']: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    // Selfie - private folder me, sirf API se milti hai
    [p + 'Photo']: { type: DataTypes.STRING(255) },
});

/**
 * Staff (teacher, accountant...) ki roz ki attendance - check-in/out ka time
 * server ka, location phone ka, aur selfie. Ek user ka ek din = ek row.
 */
const StaffAttendance = sequelize.define(
    'StaffAttendance',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        date: { type: DataTypes.DATEONLY, allowNull: false },
        status: { type: DataTypes.ENUM(...STAFF_STATUSES), allowNull: false, defaultValue: 'present' },
        ...point('in'),
        ...point('out'),
        workMinutes: { type: DataTypes.SMALLINT.UNSIGNED },
        source: { type: DataTypes.ENUM('app', 'manual'), allowNull: false, defaultValue: 'app' },
        note: { type: DataTypes.STRING(255) },
        markedById: { type: DataTypes.INTEGER.UNSIGNED },
    },
    {
        tableName: 'staff_attendance',
        indexes: [
            { unique: true, fields: ['user_id', 'date'] },
            { fields: ['school_id', 'date'] },
        ],
    }
);

export default StaffAttendance;
