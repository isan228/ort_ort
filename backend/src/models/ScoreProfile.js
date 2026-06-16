import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { SCORE_MODE } from '../constants/index.js';
import { User } from './User.js';

const ScoreProfile = sequelize.define(
  'ScoreProfile',
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
    mode: {
      type: DataTypes.ENUM(...Object.values(SCORE_MODE)),
      allowNull: false,
      defaultValue: SCORE_MODE.DRAFT,
    },
    main_score: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    subject_scores_json: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    is_locked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    locked_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lock_acknowledged_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  { tableName: 'score_profiles' }
);

User.hasMany(ScoreProfile, { foreignKey: 'user_id', as: 'scoreProfiles' });
ScoreProfile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export { ScoreProfile };
