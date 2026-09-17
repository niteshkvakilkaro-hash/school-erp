import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// 1 = Monday ... 6 = Saturday (Sunday off, isliye 0 nahi rakha)
export const WEEKDAYS = [
    { value: 1, label: 'Monday', short: 'Mon' },
    { value: 2, label: 'Tuesday', short: 'Tue' },
    { value: 3, label: 'Wednesday', short: 'Wed' },
    { value: 4, label: 'Thursday', short: 'Thu' },
    { value: 5, label: 'Friday', short: 'Fri' },
    { value: 6, label: 'Saturday', short: 'Sat' },
];

/** Ek section ke ek din ke ek period me kaunsa subject aur kaunsa teacher. */
const TimetableSlot = sequelize.define(
    'TimetableSlot',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        classId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        sectionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        periodId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        dayOfWeek: { type: DataTypes.INTEGER, allowNull: false },
        subjectId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        teacherId: { type: DataTypes.INTEGER.UNSIGNED },
        roomNo: { type: DataTypes.STRING(20) },
    },
    {
        tableName: 'timetable_slots',
        indexes: [
            // Ek section ke ek period me ek hi subject ho sakta hai
            { unique: true, fields: ['section_id', 'day_of_week', 'period_id'] },
            // Teacher clash check yahi index se tez hota hai
            { fields: ['school_id', 'teacher_id', 'day_of_week', 'period_id'] },
        ],
    }
);

export default TimetableSlot;
