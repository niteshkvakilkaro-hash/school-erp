import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const SITE_THEMES = ['emerald', 'midnight', 'royal', 'sunrise'];

/** TEXT column me JSON - MariaDB ka JSON type driver se string aata hai, isliye khud parse. */
const jsonText = (field, fallback) => ({
    type: DataTypes.TEXT,
    get() {
        const raw = this.getDataValue(field);
        if (!raw) return fallback;
        try {
            return JSON.parse(raw);
        } catch {
            return fallback;
        }
    },
    set(v) {
        this.setDataValue(field, v == null ? null : JSON.stringify(v));
    },
});

/**
 * School ki public website ka content aur theme. Har school ka ek row -
 * pehli baar admin page khulte hi default content ke saath ban jata hai.
 */
const SchoolSite = sequelize.define(
    'SchoolSite',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
        published: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        theme: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'emerald' },
        tagline: { type: DataTypes.STRING(160) },
        heroTitle: { type: DataTypes.STRING(120) },
        // Hero ki doosri line - theme ke gradient/rang me dikhti hai
        heroHighlight: { type: DataTypes.STRING(80) },
        heroSubtitle: { type: DataTypes.STRING(300) },
        about: { type: DataTypes.TEXT },
        establishedYear: { type: DataTypes.SMALLINT.UNSIGNED },
        affiliation: { type: DataTypes.STRING(120) },
        principalName: { type: DataTypes.STRING(120) },
        principalMessage: { type: DataTypes.TEXT },
        highlights: jsonText('highlights', []),
        facilities: jsonText('facilities', []),
        socials: jsonText('socials', {}),
        showStats: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        admissionOpen: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        admissionNote: { type: DataTypes.STRING(255) },
    },
    { tableName: 'school_sites' }
);

export default SchoolSite;
