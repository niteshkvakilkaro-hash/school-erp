import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/**
 * School ki HR policy - staff attendance kahan se aur kab lagegi.
 * Har school ka ek row, pehli baar HR page khulte hi default ke saath banta hai.
 */
const HrSetting = sequelize.define(
    'HrSetting',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
        // School ka GPS point - khaali ho to doori check nahi hoti
        latitude: { type: DataTypes.DECIMAL(10, 7) },
        longitude: { type: DataTypes.DECIMAL(10, 7) },
        // Itne meter ke andar = campus
        radiusM: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 200 },
        officeStart: { type: DataTypes.STRING(5), allowNull: false, defaultValue: '08:00' },
        officeEnd: { type: DataTypes.STRING(5), allowNull: false, defaultValue: '14:30' },
        // officeStart ke itne minute baad tak on-time
        graceMinutes: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 15 },
        // Isse kam kaam kiya to half-day
        halfDayMinutes: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 240 },
        requireSelfie: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        requireLocation: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        // true = campus ke bahar se check-in hi nahi; false = hone do par flag karo
        blockOutside: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        // Chhutti ke din - 0 = Sunday ... 6 = Saturday, comma se
        weeklyOff: { type: DataTypes.STRING(20), allowNull: false, defaultValue: '0' },
    },
    { tableName: 'hr_settings' }
);

export default HrSetting;
