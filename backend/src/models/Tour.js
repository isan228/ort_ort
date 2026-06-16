import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import {
  TOUR_STATUS,
  TIMER_MODE,
  TOUR_SLOT_TYPE,
  PARTICIPATION_STATUS,
} from '../constants/index.js';
import { User } from './User.js';

const Tour = sequelize.define(
  'Tour',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(TOUR_STATUS)),
      allowNull: false,
      defaultValue: TOUR_STATUS.UPCOMING,
    },
    timer_mode: {
      type: DataTypes.ENUM(...Object.values(TIMER_MODE)),
      allowNull: false,
      defaultValue: TIMER_MODE.GLOBAL,
    },
    starts_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ends_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    target_scope: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    settings_json: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: { simulation_only: true },
    },
  },
  { tableName: 'tours' }
);

const TourParticipation = sequelize.define(
  'TourParticipation',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tour_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    slot_type: {
      type: DataTypes.ENUM(...Object.values(TOUR_SLOT_TYPE)),
      allowNull: false,
    },
    score_snapshot: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    status: {
      type: DataTypes.ENUM(...Object.values(PARTICIPATION_STATUS)),
      allowNull: false,
      defaultValue: PARTICIPATION_STATUS.JOINED,
    },
    joined_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    withdrawn_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'tour_participations',
    indexes: [{ unique: true, fields: ['tour_id', 'user_id'] }],
  }
);

const RankingEntry = sequelize.define(
  'RankingEntry',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tour_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    rank: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    public_label: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    score_snapshot: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  },
  { tableName: 'ranking_entries' }
);

Tour.hasMany(TourParticipation, { foreignKey: 'tour_id', as: 'participations' });
TourParticipation.belongsTo(Tour, { foreignKey: 'tour_id', as: 'tour' });
TourParticipation.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(TourParticipation, { foreignKey: 'user_id', as: 'tourParticipations' });
Tour.hasMany(RankingEntry, { foreignKey: 'tour_id', as: 'rankingEntries' });
RankingEntry.belongsTo(Tour, { foreignKey: 'tour_id', as: 'tour' });
RankingEntry.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export { Tour, TourParticipation, RankingEntry };
