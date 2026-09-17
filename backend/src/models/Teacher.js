import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Teacher = sequelize.define(
    'Teacher',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
        employeeNo: { type: DataTypes.STRING(30), allowNull: false },
        gender: { type: DataTypes.ENUM('male', 'female', 'other') },
        dob: { type: DataTypes.DATEONLY },
        qualification: { type: DataTypes.STRING(120) },
        specialization: { type: DataTypes.STRING(120) },
        experienceYears: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
        joiningDate: { type: DataTypes.DATEONLY },
        salary: { type: DataTypes.DECIMAL(10, 2) },
        address: { type: DataTypes.STRING(255) },
        city: { type: DataTypes.STRING(80) },
        status: {
            type: DataTypes.ENUM('active', 'inactive'),
            allowNull: false,
            defaultValue: 'active',
        },
    },
    {
        tableName: 'teachers',
        indexes: [{ unique: true, fields: ['school_id', 'employee_no'] }],
    }
);

export default Teacher;
