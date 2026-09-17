import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const NOTICE_CATEGORIES = ['general', 'academic', 'event', 'holiday', 'exam', 'fee', 'urgent'];
export const NOTICE_AUDIENCES = ['all', 'staff', 'students', 'parents', 'class'];
export const NOTICE_PRIORITIES = ['low', 'medium', 'high'];

/**
 * School ki announcement. `audience` decide karta hai kise dikhegi:
 *  all      - sabko
 *  staff    - teachers/admin ko (app par nahi)
 *  students - sirf students ko
 *  parents  - sirf parents ko
 *  class    - us class (aur optionally section) ke students + unke parents ko
 */
const Notice = sequelize.define(
    'Notice',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        title: { type: DataTypes.STRING(160), allowNull: false },
        body: { type: DataTypes.TEXT, allowNull: false },
        category: {
            type: DataTypes.ENUM(...NOTICE_CATEGORIES),
            allowNull: false,
            defaultValue: 'general',
        },
        audience: {
            type: DataTypes.ENUM(...NOTICE_AUDIENCES),
            allowNull: false,
            defaultValue: 'all',
        },
        priority: {
            type: DataTypes.ENUM(...NOTICE_PRIORITIES),
            allowNull: false,
            defaultValue: 'medium',
        },
        // audience = 'class' hone par hi use hote hain
        classId: { type: DataTypes.INTEGER.UNSIGNED },
        sectionId: { type: DataTypes.INTEGER.UNSIGNED },

        publishOn: { type: DataTypes.DATEONLY, allowNull: false },
        // null = kabhi expire nahi hoti
        expiresOn: { type: DataTypes.DATEONLY },
        isPublished: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        // Events ke liye - notice board par date dikhane ke kaam aati hai
        eventDate: { type: DataTypes.DATEONLY },
        attachmentUrl: { type: DataTypes.STRING(255) },
        createdById: { type: DataTypes.INTEGER.UNSIGNED },
    },
    {
        tableName: 'notices',
        indexes: [
            { fields: ['school_id', 'publish_on'] },
            { fields: ['school_id', 'audience'] },
        ],
    }
);

/** Aaj ki date par ye notice live hai ya nahi. */
Notice.prototype.isLive = function (today) {
    const d = today || new Date().toISOString().slice(0, 10);
    if (!this.isPublished) return false;
    if (this.publishOn > d) return false;
    if (this.expiresOn && this.expiresOn < d) return false;
    return true;
};

export default Notice;
