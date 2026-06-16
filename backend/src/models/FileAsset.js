import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { User } from './User.js';

const FileAsset = sequelize.define(
  'FileAsset',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    storage_key: {
      type: DataTypes.STRING(512),
      allowNull: false,
    },
    mime_type: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    owner_type: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    owner_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    visibility: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'private',
    },
  },
  { tableName: 'file_assets' }
);

export { FileAsset };
