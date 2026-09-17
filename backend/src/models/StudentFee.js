import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * Ek student par lagi hui ek fee - yani uska invoice line.
 * `paidAmount` payments se derive hota hai, isliye payment record hone par
 * hi update karte hain (controller ek jagah se).
 */
const StudentFee = sequelize.define(
    'StudentFee',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        studentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        feeHeadId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
        // Scholarship / sibling discount
        discount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
        paidAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
        dueDate: { type: DataTypes.DATEONLY },
        status: {
            type: DataTypes.ENUM('pending', 'partial', 'paid', 'waived'),
            allowNull: false,
            defaultValue: 'pending',
        },
        remarks: { type: DataTypes.STRING(255) },
    },
    {
        tableName: 'student_fees',
        indexes: [
            // Ek student par ek fee head ek hi baar lagta hai
            { unique: true, fields: ['student_id', 'fee_head_id'] },
            { fields: ['school_id', 'status'] },
        ],
    }
);

/** amount - discount = kitna dena hai. Iske against paidAmount chalta hai. */
StudentFee.prototype.payable = function () {
    return Number(this.amount) - Number(this.discount);
};

StudentFee.prototype.pending = function () {
    return Math.max(0, this.payable() - Number(this.paidAmount));
};

export default StudentFee;
