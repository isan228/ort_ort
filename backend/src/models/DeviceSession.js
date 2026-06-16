import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { DEVICE_TYPE } from '../constants/index.js';
import { User } from './User.js';

const DeviceSession = sequelize.define(
  'DeviceSession',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    device_type: {
      type: DataTypes.ENUM(...Object.values(DEVICE_TYPE)),
      allowNull: false,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ip: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    os: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    browser: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    is_suspicious: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    refresh_token_hash: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    last_seen_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  { tableName: 'device_sessions' }
);

User.hasMany(DeviceSession, { foreignKey: 'user_id', as: 'deviceSessions' });
DeviceSession.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export { DeviceSession };
