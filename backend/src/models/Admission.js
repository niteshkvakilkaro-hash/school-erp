import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/** Admission ke stages - ek ke baad ek. `admitted` par Student record ban jata hai. */
export const ADMISSION_STATUSES = ['enquiry', 'applied', 'interview', 'approved', 'admitted', 'rejected', 'withdrawn'];

/**
 * Ek enquiry / application. Student banne se pehle ka poora record yahan
 * rehta hai; admit hone par `studentId` bhar jata hai aur record lock ho jata hai.
 */
const Admission = sequelize.define(
    'Admission',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        applicationNo: { type: DataTypes.STRING(30), allowNull: false },
        firstName: { type: DataTypes.STRING(60), allowNull: false },
        lastName: { type: DataTypes.STRING(60) },
        gender: { type: DataTypes.ENUM('male', 'female', 'other') },
        dob: { type: DataTypes.DATEONLY },
        // Kis class me admission chahiye
        classId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        fatherName: { type: DataTypes.STRING(120) },
        motherName: { type: DataTypes.STRING(120) },
        guardianPhone: { type: DataTypes.STRING(20), allowNull: false },
        guardianEmail: { type: DataTypes.STRING(160) },
        address: { type: DataTypes.STRING(255) },
        city: { type: DataTypes.STRING(80) },
        previousSchool: { type: DataTypes.STRING(160) },
        source: {
            type: DataTypes.ENUM('walk-in', 'phone', 'website', 'referral', 'social', 'other'),
            allowNull: false,
            defaultValue: 'walk-in',
        },
        status: {
            type: DataTypes.ENUM(...ADMISSION_STATUSES),
            allowNull: false,
            defaultValue: 'enquiry',
        },
        interviewAt: { type: DataTypes.DATE },
        followUpOn: { type: DataTypes.DATEONLY },
        studentId: { type: DataTypes.INTEGER.UNSIGNED, unique: true },
        admittedOn: { type: DataTypes.DATEONLY },
        createdById: { type: DataTypes.INTEGER.UNSIGNED },
    },
    {
        tableName: 'admissions',
        indexes: [
            { unique: true, fields: ['school_id', 'application_no'] },
            { fields: ['school_id', 'status'] },
            { fields: ['school_id', 'guardian_phone'] },
        ],
    }
);

export default Admission;
