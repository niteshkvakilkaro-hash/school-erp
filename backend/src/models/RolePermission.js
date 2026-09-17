import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const RolePermission = sequelize.define(
    'RolePermission',
    {
        roleId: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
        permissionId: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
    },
    { tableName: 'role_permissions', timestamps: false }
);

export default RolePermission;
