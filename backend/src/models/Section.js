import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Section = sequelize.define(
    'Section',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        name: { type: DataTypes.STRING(20), allowNull: false },
        classId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        capacity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 40 },
        teacherId: { type: DataTypes.INTEGER.UNSIGNED },
        roomNo: { type: DataTypes.STRING(20) },
    },
    {
        tableName: 'sections',
        indexes: [{ unique: true, fields: ['class_id', 'name'] }, { fields: ['school_id'] }],
    }
);

export default Section;
