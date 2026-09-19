import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const PAY_PROVIDERS = ['none', 'demo', 'razorpay'];

/**
 * School ka online payment setup. Paisa seedha school ke apne Razorpay account
 * me jaata hai - keys school admin daalta hai, encrypted rehti hain.
 */
const PaymentSetting = sequelize.define(
    'PaymentSetting',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
        provider: { type: DataTypes.ENUM(...PAY_PROVIDERS), allowNull: false, defaultValue: 'none' },
        keyId: { type: DataTypes.STRING(60) },
        keySecretEnc: { type: DataTypes.TEXT },
        webhookSecretEnc: { type: DataTypes.TEXT },
    },
    { tableName: 'payment_settings' }
);

export default PaymentSetting;
