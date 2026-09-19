import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const OUTCOMES = ['promoted', 'detained', 'graduated', 'left'];

/**
 * Student kis session me kis class / section me tha aur saal ke ant me kya hua.
 * Promotion ke waqt purani jagah ka snapshot - isi se undo bhi hota hai.
 */
const StudentEnrollment = sequelize.define(
    'StudentEnrollment',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        studentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        runId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        session: { type: DataTypes.STRING(20) },
        classId: { type: DataTypes.INTEGER.UNSIGNED },
        sectionId: { type: DataTypes.INTEGER.UNSIGNED },
        // Snapshot ke waqt naam bhi - class baad me delete / rename ho jaye to bhi history padhne layak rahe
        className: { type: DataTypes.STRING(60) },
        sectionName: { type: DataTypes.STRING(40) },
        rollNo: { type: DataTypes.STRING(20) },
        status: { type: DataTypes.STRING(20) },
        outcome: { type: DataTypes.ENUM(...OUTCOMES), allowNull: false },
        toClassId: { type: DataTypes.INTEGER.UNSIGNED },
        toSectionId: { type: DataTypes.INTEGER.UNSIGNED },
    },
    {
        tableName: 'student_enrollments',
        updatedAt: false,
        indexes: [{ unique: true, fields: ['run_id', 'student_id'] }, { fields: ['school_id', 'student_id'] }],
    }
);

export default StudentEnrollment;
