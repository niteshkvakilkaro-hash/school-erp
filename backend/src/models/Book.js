import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * Library catalogue ki ek title. Ek title ki kai copies ho sakti hain -
 * `totalCopies` kitni kharidi, available issues se nikalta hai (store nahi
 * karte, warna issue/return me kabhi mismatch ho jata).
 */
const Book = sequelize.define(
    'Book',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        title: { type: DataTypes.STRING(200), allowNull: false },
        author: { type: DataTypes.STRING(160) },
        publisher: { type: DataTypes.STRING(160) },
        isbn: { type: DataTypes.STRING(20) },
        // School ka apna accession/catalogue code
        code: { type: DataTypes.STRING(30), allowNull: false },
        category: { type: DataTypes.STRING(60) },
        // Kis class ke liye hai - null = general
        classId: { type: DataTypes.INTEGER.UNSIGNED },
        totalCopies: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
        shelf: { type: DataTypes.STRING(30) },
        price: { type: DataTypes.DECIMAL(10, 2) },
        status: {
            type: DataTypes.ENUM('active', 'inactive'),
            allowNull: false,
            defaultValue: 'active',
        },
    },
    {
        tableName: 'books',
        indexes: [
            { unique: true, fields: ['school_id', 'code'] },
            { fields: ['school_id', 'title'] },
        ],
    }
);

export default Book;
