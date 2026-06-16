import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const AuditLog = sequelize.define(
  'AuditLog',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    actor_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    actor_role: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    action_code: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    entity_type: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    entity_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    before_json: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    after_json: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    ip: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
  },
  { tableName: 'audit_logs', updatedAt: false }
);

export { AuditLog };
