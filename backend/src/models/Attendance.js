import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const ATTENDANCE_STATUS = ['present', 'absent', 'leave', 'half-day'];

const Attendance = sequelize.define(
    'Attendance',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        studentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        // Class/section bhi store karte hain taki student class badalne par
        // purana record apni asli class ke saath hi rahe
        classId: { type: DataTypes.INTEGER.UNSIGNED },
        sectionId: { type: DataTypes.INTEGER.UNSIGNED },
        date: { type: DataTypes.DATEONLY, allowNull: false },
        status: { type: DataTypes.ENUM(...ATTENDANCE_STATUS), allowNull: false, defaultValue: 'present' },
        remarks: { type: DataTypes.STRING(255) },
        markedById: { type: DataTypes.INTEGER.UNSIGNED },
    },
    {
        tableName: 'attendance',
        indexes: [
            // Ek student ka ek din me ek hi record - dobara marking update karti hai
            { unique: true, fields: ['student_id', 'date'] },
            { fields: ['school_id', 'date'] },
            { fields: ['class_id', 'section_id', 'date'] },
        ],
    }
);

export default Attendance;
