import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * Permission catalog - ye fixed list hai jo seeder banata hai.
 * Slug format: "<module>.<action>", e.g. students.create
 */
const Permission = sequelize.define(
    'Permission',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        slug: { type: DataTypes.STRING(60), allowNull: false, unique: true },
        module: { type: DataTypes.STRING(40), allowNull: false },
        label: { type: DataTypes.STRING(120), allowNull: false },
        // platform = sirf super admin ke liye, school = school ke andar ka kaam
        scope: {
            type: DataTypes.ENUM('platform', 'school'),
            allowNull: false,
            defaultValue: 'school',
        },
    },
    { tableName: 'permissions', timestamps: false }
);

export default Permission;
