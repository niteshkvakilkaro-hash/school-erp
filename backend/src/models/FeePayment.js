import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const PAYMENT_MODES = ['cash', 'upi', 'card', 'netbanking', 'cheque', 'dd'];

/** Ek payment receipt - kaunsi fee ke against, kitna, kis mode se. */
const FeePayment = sequelize.define(
    'FeePayment',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        studentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        studentFeeId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        receiptNo: { type: DataTypes.STRING(30), allowNull: false },
        amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        mode: { type: DataTypes.ENUM(...PAYMENT_MODES), allowNull: false, defaultValue: 'cash' },
        // Cheque number / UPI txn id
        reference: { type: DataTypes.STRING(60) },
        paidOn: { type: DataTypes.DATEONLY, allowNull: false },
        collectedById: { type: DataTypes.INTEGER.UNSIGNED },
        remarks: { type: DataTypes.STRING(255) },
    },
    {
        tableName: 'fee_payments',
        indexes: [
            { unique: true, fields: ['school_id', 'receipt_no'] },
            { fields: ['school_id', 'paid_on'] },
            { fields: ['student_id'] },
        ],
    }
);

export default FeePayment;
