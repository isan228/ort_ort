import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { REDEMPTION_FEATURE } from '../constants/index.js';
import { User } from './User.js';

const FeatureUnlock = sequelize.define(
  'FeatureUnlock',
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
    feature: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    uses_remaining: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    source: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: 'bonus_redeem',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
  },
  {
    tableName: 'feature_unlocks',
    indexes: [{ fields: ['user_id', 'feature'] }],
  }
);

User.hasMany(FeatureUnlock, { foreignKey: 'user_id', as: 'featureUnlocks' });
FeatureUnlock.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export { FeatureUnlock };
