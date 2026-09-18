import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * Ek book ki ek copy kisi student ya staff ko issue hui.
 * returnedOn null = abhi bahar hai.
 */
const BookIssue = sequelize.define(
    'BookIssue',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        bookId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        // Student ya staff - dono me se ek hi
        studentId: { type: DataTypes.INTEGER.UNSIGNED },
        userId: { type: DataTypes.INTEGER.UNSIGNED },
        issuedOn: { type: DataTypes.DATEONLY, allowNull: false },
        dueOn: { type: DataTypes.DATEONLY, allowNull: false },
        returnedOn: { type: DataTypes.DATEONLY },
        // Return par calculate hota hai aur freeze ho jata hai
        fine: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
        finePaid: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        remarks: { type: DataTypes.STRING(255) },
        issuedById: { type: DataTypes.INTEGER.UNSIGNED },
    },
    {
        tableName: 'book_issues',
        indexes: [
            { fields: ['school_id', 'returned_on'] },
            { fields: ['book_id', 'returned_on'] },
            { fields: ['student_id'] },
        ],
    }
);

export default BookIssue;
