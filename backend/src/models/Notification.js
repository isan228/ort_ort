import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { NOTIFICATION_TYPE } from '../constants/index.js';
import { User } from './User.js';

const Notification = sequelize.define(
  'Notification',
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
    type: {
      type: DataTypes.ENUM(...Object.values(NOTIFICATION_TYPE)),
      allowNull: false,
      defaultValue: NOTIFICATION_TYPE.SYSTEM,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    action_url: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  { tableName: 'notifications' }
);

User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export { Notification };
