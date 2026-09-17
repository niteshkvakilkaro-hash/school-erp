import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * Ek tenant = ek school. Poore system ka har record isi se juda hota hai
 * (users, students, classes... sab par schoolId).
 */
const School = sequelize.define(
    'School',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(160), allowNull: false },
        // Login par school pehchanne ke liye - e.g. "DPS-INDORE"
        code: { type: DataTypes.STRING(40), allowNull: false, unique: true },
        // Future subdomain routing ke liye - e.g. dps.erpsc.app
        slug: { type: DataTypes.STRING(60), allowNull: false, unique: true },
        email: { type: DataTypes.STRING(160), validate: { isEmail: true } },
        phone: { type: DataTypes.STRING(20) },
        address: { type: DataTypes.STRING(255) },
        city: { type: DataTypes.STRING(80) },
        state: { type: DataTypes.STRING(80) },
        pincode: { type: DataTypes.STRING(10) },
        logo: { type: DataTypes.STRING(255) },
        website: { type: DataTypes.STRING(160) },
        // Academic session - "2026-27"
        session: { type: DataTypes.STRING(20) },
        status: {
            type: DataTypes.ENUM('active', 'suspended', 'trial'),
            allowNull: false,
            defaultValue: 'trial',
        },
    },
    { tableName: 'schools' }
);

export default School;
