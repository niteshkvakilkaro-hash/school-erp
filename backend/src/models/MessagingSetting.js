import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const MSG_PROVIDERS = ['none', 'demo', 'msg91', 'whatsapp'];
export const MSG_EVENTS = ['absent', 'feeReceipt', 'feeReminder', 'leaveDecision'];

const json = (field, fallback) => ({
    type: DataTypes.TEXT,
    get() {
        try {
            return { ...fallback, ...JSON.parse(this.getDataValue(field) || '{}') };
        } catch {
            return { ...fallback };
        }
    },
    set(v) {
        this.setDataValue(field, JSON.stringify(v || {}));
    },
});

/**
 * School ka SMS / WhatsApp setup - provider, (encrypted) keys, har event
 * on/off aur provider ke approved template ids.
 */
const MessagingSetting = sequelize.define(
    'MessagingSetting',
    {
        id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        schoolId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
        provider: { type: DataTypes.ENUM(...MSG_PROVIDERS), allowNull: false, defaultValue: 'none' },
        // MSG91: authkey + sender id; WhatsApp: access token + phone number id
        apiKeyEnc: { type: DataTypes.TEXT },
        senderId: { type: DataTypes.STRING(60) },
        events: json('events', { absent: true, feeReceipt: true, feeReminder: true, leaveDecision: true }),
        // event -> MSG91 template_id / WhatsApp template name
        templates: json('templates', {}),
    },
    { tableName: 'messaging_settings' }
);

export default MessagingSetting;
