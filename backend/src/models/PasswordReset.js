import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const PasswordResetToken = sequelize.define(
  'PasswordResetToken',
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
    token_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    used_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  { tableName: 'password_reset_tokens' }
);

export { PasswordResetToken };
