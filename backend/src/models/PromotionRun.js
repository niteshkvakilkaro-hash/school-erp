import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

/** Ek "naya session" chalana - kisne, kab, kitne promote/roke/pass-out. Aakhri run undo ho sakta hai. */
const PromotionRun = sequelize.define(
    'PromotionRun',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        fromSession: { type: DataTypes.STRING(20) },
        toSession: { type: DataTypes.STRING(20), allowNull: false },
        createdById: { type: DataTypes.INTEGER.UNSIGNED },
        promoted: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        detained: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        graduated: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        left: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        rollReset: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        undoneAt: { type: DataTypes.DATE },
        undoneById: { type: DataTypes.INTEGER.UNSIGNED },
    },
    { tableName: 'promotion_runs', updatedAt: false, indexes: [{ fields: ['school_id', 'created_at'] }] }
);

export default PromotionRun;
