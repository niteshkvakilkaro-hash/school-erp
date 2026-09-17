import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const SchoolClass = sequelize.define(
    'SchoolClass',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        name: { type: DataTypes.STRING(60), allowNull: false },
        // Ordering ke liye - "Class 10" ko 10 par sort kar sake
        level: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        classTeacherId: { type: DataTypes.INTEGER.UNSIGNED },
        description: { type: DataTypes.STRING(255) },
        status: {
            type: DataTypes.ENUM('active', 'inactive'),
            allowNull: false,
            defaultValue: 'active',
        },
    },
    {
        tableName: 'classes',
        indexes: [{ unique: true, fields: ['school_id', 'name'] }],
    }
);

export default SchoolClass;
