import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { CERTIFICATE_STATUS, CORRECTION_STATUS } from '../constants/index.js';
import { User } from './User.js';
import { FileAsset } from './FileAsset.js';
import { ScoreProfile } from './ScoreProfile.js';

const Certificate = sequelize.define(
  'Certificate',
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
    file_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(CERTIFICATE_STATUS)),
      allowNull: false,
      defaultValue: CERTIFICATE_STATUS.NOT_UPLOADED,
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    verified_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  { tableName: 'certificates' }
);

const ScoreCorrectionRequest = sequelize.define(
  'ScoreCorrectionRequest',
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
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(CORRECTION_STATUS)),
      allowNull: false,
      defaultValue: CORRECTION_STATUS.PENDING,
    },
    admin_comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    resolved_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  { tableName: 'score_correction_requests' }
);

User.hasMany(Certificate, { foreignKey: 'user_id', as: 'certificates' });
Certificate.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Certificate.belongsTo(FileAsset, { foreignKey: 'file_id', as: 'file' });

User.hasMany(ScoreCorrectionRequest, { foreignKey: 'user_id', as: 'correctionRequests' });
ScoreCorrectionRequest.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
ScoreCorrectionRequest.belongsTo(ScoreProfile, { foreignKey: 'score_profile_id', as: 'scoreProfile' });
ScoreProfile.hasMany(ScoreCorrectionRequest, { foreignKey: 'score_profile_id', as: 'correctionRequests' });

export { Certificate, ScoreCorrectionRequest };
