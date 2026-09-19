import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * "Password bhool gaye" ki ek request. OTP khud save nahi hota - sirf uska hash.
 * 10 minute me expire, 5 galat try ke baad band, ek baar use ke baad khatam.
 */
const PasswordReset = sequelize.define(
    'PasswordReset',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED },
        ref: { type: DataTypes.STRING(48), allowNull: false, unique: true },
        otpHash: { type: DataTypes.STRING(64), allowNull: false },
        expiresAt: { type: DataTypes.DATE, allowNull: false },
        attempts: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
        usedAt: { type: DataTypes.DATE },
        ip: { type: DataTypes.STRING(45) },
    },
    { tableName: 'password_resets', updatedAt: false, indexes: [{ fields: ['user_id', 'created_at'] }] }
);

export default PasswordReset;
