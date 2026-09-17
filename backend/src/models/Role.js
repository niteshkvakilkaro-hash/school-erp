import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * schoolId null = platform role (Super Admin).
 * isSystem = true wale roles har school me default aate hain aur delete nahi hote,
 * lekin unke permissions school apni zaroorat ke hisaab se badal sakta hai.
 */
const Role = sequelize.define(
    'Role',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED },
        name: { type: DataTypes.STRING(60), allowNull: false },
        slug: { type: DataTypes.STRING(60), allowNull: false },
        description: { type: DataTypes.STRING(255) },
        scope: {
            type: DataTypes.ENUM('platform', 'school'),
            allowNull: false,
            defaultValue: 'school',
        },
        isSystem: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        // Student/Parent roles mobile app use karte hain, admin panel nahi
        portalOnly: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
        tableName: 'roles',
        indexes: [{ unique: true, fields: ['school_id', 'slug'] }],
    }
);

export default Role;
