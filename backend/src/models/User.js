import { DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import { sequelize } from '../config/database.js';

const User = sequelize.define(
    'User',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        // null = platform user (Super Admin), warna us school ka member
        schoolId: { type: DataTypes.INTEGER.UNSIGNED },
        roleId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        name: { type: DataTypes.STRING(120), allowNull: false },
        email: { type: DataTypes.STRING(160), allowNull: false, validate: { isEmail: true } },
        password: { type: DataTypes.STRING(255), allowNull: false },
        phone: { type: DataTypes.STRING(20) },
        avatar: { type: DataTypes.STRING(255) },
        status: {
            type: DataTypes.ENUM('active', 'inactive'),
            allowNull: false,
            defaultValue: 'active',
        },
        lastLoginAt: { type: DataTypes.DATE },
    },
    {
        tableName: 'users',
        // Email sirf ek school ke andar unique hai - do alag schools me same email chal sakta hai
        indexes: [{ unique: true, fields: ['school_id', 'email'] }, { fields: ['email'] }],
        defaultScope: { attributes: { exclude: ['password'] } },
        scopes: { withPassword: { attributes: { include: ['password'] } } },
        hooks: {
            beforeSave: async (user) => {
                if (user.changed('password')) {
                    user.password = await bcrypt.hash(user.password, 10);
                }
                if (user.changed('email') && user.email) {
                    user.email = user.email.trim().toLowerCase();
                }
            },
        },
    }
);

User.prototype.verifyPassword = function (plain) {
    return bcrypt.compare(plain, this.password);
};

export default User;
