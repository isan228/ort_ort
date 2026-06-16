import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { LEGAL_DOCUMENT_TYPE } from '../constants/index.js';
import { User } from './User.js';

const LegalAcceptance = sequelize.define(
  'LegalAcceptance',
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
    document_type: {
      type: DataTypes.ENUM(...Object.values(LEGAL_DOCUMENT_TYPE)),
      allowNull: false,
    },
    document_version: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    accepted_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  { tableName: 'legal_acceptances' }
);

User.hasMany(LegalAcceptance, { foreignKey: 'user_id', as: 'legalAcceptances' });
LegalAcceptance.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export { LegalAcceptance };
