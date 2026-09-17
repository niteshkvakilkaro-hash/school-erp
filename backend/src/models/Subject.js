import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Subject = sequelize.define(
    'Subject',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        name: { type: DataTypes.STRING(100), allowNull: false },
        code: { type: DataTypes.STRING(20), allowNull: false },
        classId: { type: DataTypes.INTEGER.UNSIGNED },
        teacherId: { type: DataTypes.INTEGER.UNSIGNED },
        type: {
            type: DataTypes.ENUM('theory', 'practical', 'elective'),
            allowNull: false,
            defaultValue: 'theory',
        },
        maxMarks: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 100 },
        passMarks: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 33 },
    },
    {
        tableName: 'subjects',
        indexes: [{ unique: true, fields: ['school_id', 'code'] }],
    }
);

export default Subject;
