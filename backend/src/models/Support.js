import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { TICKET_STATUS } from '../constants/index.js';
import { User } from './User.js';

const SupportTicket = sequelize.define(
  'SupportTicket',
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
    topic: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(TICKET_STATUS)),
      allowNull: false,
      defaultValue: TICKET_STATUS.OPEN,
    },
    assigned_to: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    last_reply_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  { tableName: 'support_tickets' }
);

const SupportMessage = sequelize.define(
  'SupportMessage',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ticket_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    sender_role: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    sender_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  { tableName: 'support_messages' }
);

User.hasMany(SupportTicket, { foreignKey: 'user_id', as: 'supportTickets' });
SupportTicket.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
SupportTicket.hasMany(SupportMessage, { foreignKey: 'ticket_id', as: 'messages' });
SupportMessage.belongsTo(SupportTicket, { foreignKey: 'ticket_id', as: 'ticket' });

export { SupportTicket, SupportMessage };
