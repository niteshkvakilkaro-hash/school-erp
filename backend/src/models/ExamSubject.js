import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/** Exam ka datesheet row - kaunsa subject, kis din, kitne marks ka. */
const ExamSubject = sequelize.define(
    'ExamSubject',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        examId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        subjectId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        examDate: { type: DataTypes.DATEONLY, allowNull: false },
        startTime: { type: DataTypes.STRING(5) },
        endTime: { type: DataTypes.STRING(5) },
        maxMarks: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 100 },
        passMarks: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 33 },
        roomNo: { type: DataTypes.STRING(20) },
    },
    {
        tableName: 'exam_subjects',
        indexes: [{ unique: true, fields: ['exam_id', 'subject_id'] }],
    }
);

export default ExamSubject;
