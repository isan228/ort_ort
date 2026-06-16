import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { User } from './User.js';
import { ScoreProfile } from './ScoreProfile.js';

const Analysis = sequelize.define(
  'Analysis',
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
    score_profile_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    input_json: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    result_json: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    algorithm_version: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'mvp-1',
    },
    is_trial: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  { tableName: 'analyses' }
);

User.hasMany(Analysis, { foreignKey: 'user_id', as: 'analyses' });
Analysis.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Analysis.belongsTo(ScoreProfile, { foreignKey: 'score_profile_id', as: 'scoreProfile' });

export { Analysis };
