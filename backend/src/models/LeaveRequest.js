import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const LEAVE_TYPES = ['casual', 'sick', 'earned', 'unpaid', 'other'];

/** Staff ki chhutti ki arzi - app se apply, admin panel se approve/reject. */
const LeaveRequest = sequelize.define(
    'LeaveRequest',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        type: { type: DataTypes.ENUM(...LEAVE_TYPES), allowNull: false, defaultValue: 'casual' },
        fromDate: { type: DataTypes.DATEONLY, allowNull: false },
        toDate: { type: DataTypes.DATEONLY, allowNull: false },
        // Weekly off chhod kar kitne din
        days: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
        reason: { type: DataTypes.STRING(500), allowNull: false },
        status: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
            allowNull: false,
            defaultValue: 'pending',
        },
        reviewedById: { type: DataTypes.INTEGER.UNSIGNED },
        reviewNote: { type: DataTypes.STRING(255) },
        reviewedAt: { type: DataTypes.DATE },
    },
    {
        tableName: 'leave_requests',
        indexes: [{ fields: ['school_id', 'status'] }, { fields: ['user_id', 'from_date'] }],
    }
);

export default LeaveRequest;
