import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Homework = sequelize.define(
    'Homework',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        classId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        // sectionId null = poori class ke liye
        sectionId: { type: DataTypes.INTEGER.UNSIGNED },
        subjectId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        teacherId: { type: DataTypes.INTEGER.UNSIGNED },
        title: { type: DataTypes.STRING(160), allowNull: false },
        description: { type: DataTypes.TEXT },
        assignedDate: { type: DataTypes.DATEONLY, allowNull: false },
        dueDate: { type: DataTypes.DATEONLY, allowNull: false },
        attachmentUrl: { type: DataTypes.STRING(255) },
        status: {
            type: DataTypes.ENUM('open', 'closed'),
            allowNull: false,
            defaultValue: 'open',
        },
    },
    {
        tableName: 'homework',
        indexes: [{ fields: ['school_id', 'class_id', 'section_id'] }, { fields: ['due_date'] }],
    }
);

export default Homework;
