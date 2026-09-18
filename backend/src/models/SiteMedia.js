import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const MEDIA_KINDS = ['slide', 'gallery', 'logo', 'principal'];
/** Har kind ki max ginti - disk aur page speed dono ke liye. */
export const MEDIA_LIMITS = { slide: 8, gallery: 80, logo: 1, principal: 1 };

/**
 * Website ki upload ki hui photo. File disk par `uploads/schools/<id>/` me,
 * yahan sirf uska path aur caption. Delete karne par file bhi hat-ti hai.
 */
const SiteMedia = sequelize.define(
    'SiteMedia',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        kind: { type: DataTypes.ENUM(...MEDIA_KINDS), allowNull: false },
        url: { type: DataTypes.STRING(255), allowNull: false },
        // Chhota version - gallery grid ke liye
        thumbUrl: { type: DataTypes.STRING(255) },
        width: { type: DataTypes.SMALLINT.UNSIGNED },
        height: { type: DataTypes.SMALLINT.UNSIGNED },
        bytes: { type: DataTypes.INTEGER.UNSIGNED },
        title: { type: DataTypes.STRING(120) },
        caption: { type: DataTypes.STRING(255) },
        // Gallery ka album - "Sports", "Annual Day"...
        category: { type: DataTypes.STRING(40) },
        sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
        tableName: 'site_media',
        indexes: [{ fields: ['school_id', 'kind', 'sort_order'] }],
    }
);

export default SiteMedia;
