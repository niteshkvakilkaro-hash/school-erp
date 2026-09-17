import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const Student = sequelize.define(
    'Student',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        userId: { type: DataTypes.INTEGER.UNSIGNED, unique: true },
        admissionNo: { type: DataTypes.STRING(30), allowNull: false },
        firstName: { type: DataTypes.STRING(60), allowNull: false },
        lastName: { type: DataTypes.STRING(60) },
        gender: { type: DataTypes.ENUM('male', 'female', 'other') },
        dob: { type: DataTypes.DATEONLY },
        bloodGroup: { type: DataTypes.STRING(5) },
        classId: { type: DataTypes.INTEGER.UNSIGNED },
        sectionId: { type: DataTypes.INTEGER.UNSIGNED },
        rollNo: { type: DataTypes.STRING(20) },
        fatherName: { type: DataTypes.STRING(120) },
        motherName: { type: DataTypes.STRING(120) },
        guardianPhone: { type: DataTypes.STRING(20) },
        guardianEmail: { type: DataTypes.STRING(160) },
        address: { type: DataTypes.STRING(255) },
        city: { type: DataTypes.STRING(80) },
        admissionDate: { type: DataTypes.DATEONLY },
        status: {
            type: DataTypes.ENUM('active', 'inactive', 'alumni'),
            allowNull: false,
            defaultValue: 'active',
        },
    },
    {
        tableName: 'students',
        indexes: [
            { unique: true, fields: ['school_id', 'admission_no'] },
            { fields: ['school_id', 'class_id', 'section_id'] },
        ],
        getterMethods: {
            fullName() {
                return [this.firstName, this.lastName].filter(Boolean).join(' ');
            },
        },
    }
);

export default Student;
