import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const EXAM_TYPES = ['unit-test', 'mid-term', 'final', 'practical', 'other'];

const Exam = sequelize.define(
    'Exam',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        name: { type: DataTypes.STRING(120), allowNull: false },
        type: { type: DataTypes.ENUM(...EXAM_TYPES), allowNull: false, defaultValue: 'unit-test' },
        // classId null = saari classes ke liye
        classId: { type: DataTypes.INTEGER.UNSIGNED },
        startDate: { type: DataTypes.DATEONLY, allowNull: false },
        endDate: { type: DataTypes.DATEONLY, allowNull: false },
        // results publish hone ke baad hi parents/students ko dikhta hai
        resultsPublished: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        description: { type: DataTypes.STRING(255) },
    },
    {
        tableName: 'exams',
        indexes: [{ fields: ['school_id', 'class_id'] }],
    }
);

/** Date ke hisaab se upcoming / ongoing / completed - alag column rakhne ki zaroorat nahi. */
Exam.prototype.computedStatus = function () {
    const today = new Date().toISOString().slice(0, 10);
    if (today < this.startDate) return 'upcoming';
    if (today > this.endDate) return 'completed';
    return 'ongoing';
};

export default Exam;
