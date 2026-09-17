import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/** Ek student ke ek exam-subject ke marks. */
const Mark = sequelize.define(
    'Mark',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        examSubjectId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        studentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        // null = abhi tak marks nahi bhare gaye (absent se alag cheez hai)
        marksObtained: { type: DataTypes.DECIMAL(6, 2) },
        isAbsent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        remarks: { type: DataTypes.STRING(255) },
        enteredById: { type: DataTypes.INTEGER.UNSIGNED },
    },
    {
        tableName: 'marks',
        indexes: [{ unique: true, fields: ['exam_subject_id', 'student_id'] }],
    }
);

export default Mark;
