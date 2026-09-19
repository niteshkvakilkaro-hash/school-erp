import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * Online payment ki ek koshish - kaunsi fee lines, kitna, gateway ka order id.
 * Paid hone par har line ki FeePayment (receipt) banti hai.
 */
const PaymentOrder = sequelize.define(
    'PaymentOrder',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        studentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        createdById: { type: DataTypes.INTEGER.UNSIGNED },
        // Hamara reference - "PAY2026-0001"
        ref: { type: DataTypes.STRING(30), allowNull: false },
        // Payment page ka unguessable link token
        token: { type: DataTypes.STRING(64), allowNull: false, unique: true },
        gateway: { type: DataTypes.ENUM('demo', 'razorpay'), allowNull: false },
        gatewayOrderId: { type: DataTypes.STRING(60), unique: true },
        gatewayPaymentId: { type: DataTypes.STRING(60), unique: true },
        amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        // [{ studentFeeId, feeHead, amount }]
        linesJson: { type: DataTypes.TEXT, allowNull: false },
        status: {
            type: DataTypes.ENUM('created', 'paid', 'failed', 'expired'),
            allowNull: false,
            defaultValue: 'created',
        },
        method: { type: DataTypes.STRING(30) },
        paidAt: { type: DataTypes.DATE },
        receiptNos: { type: DataTypes.STRING(255) },
        // Beech me counter par bhi bhar diya to jo zyada aaya (refund ke liye)
        excess: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
        failureReason: { type: DataTypes.STRING(255) },
    },
    {
        tableName: 'payment_orders',
        indexes: [{ unique: true, fields: ['school_id', 'ref'] }, { fields: ['school_id', 'status'] }, { fields: ['student_id'] }],
        getterMethods: {
            lines() {
                try {
                    return JSON.parse(this.getDataValue('linesJson') || '[]');
                } catch {
                    return [];
                }
            },
        },
    }
);

export default PaymentOrder;
