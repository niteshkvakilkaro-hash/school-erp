import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * Parent login ko students se jodta hai. Ek parent ke kai bachche ho sakte hain
 * aur ek student ke mata-pita dono ke alag login ho sakte hain.
 */
const StudentGuardian = sequelize.define(
    'StudentGuardian',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        studentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        relation: {
            type: DataTypes.ENUM('father', 'mother', 'guardian'),
            allowNull: false,
            defaultValue: 'guardian',
        },
        isPrimary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
        tableName: 'student_guardians',
        indexes: [{ unique: true, fields: ['user_id', 'student_id'] }],
    }
);

export default StudentGuardian;
