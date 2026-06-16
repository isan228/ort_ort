import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { REFERRAL_REWARD_STATUS } from '../constants/index.js';
import { User } from './User.js';

const ReferralCode = sequelize.define(
  'ReferralCode',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    code: {
      type: DataTypes.STRING(32),
      allowNull: false,
      unique: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  { tableName: 'referral_codes' }
);

const ReferralEvent = sequelize.define(
  'ReferralEvent',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    referrer_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    referred_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    event_type: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: 'registration',
    },
    reward_status: {
      type: DataTypes.ENUM(...Object.values(REFERRAL_REWARD_STATUS)),
      allowNull: false,
      defaultValue: REFERRAL_REWARD_STATUS.PENDING,
    },
    reward_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
  },
  { tableName: 'referral_events' }
);

User.hasOne(ReferralCode, { foreignKey: 'user_id', as: 'referralCode' });
ReferralCode.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
ReferralEvent.belongsTo(User, { foreignKey: 'referrer_user_id', as: 'referrer' });
ReferralEvent.belongsTo(User, { foreignKey: 'referred_user_id', as: 'referred' });

export { ReferralCode, ReferralEvent };
