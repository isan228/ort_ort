import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { SUBSCRIPTION_STATUS } from '../constants/index.js';
import { User } from './User.js';

const SubscriptionPlan = sequelize.define(
  'SubscriptionPlan',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    price_kgs: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    duration_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    features: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  { tableName: 'subscription_plans' }
);

const Subscription = sequelize.define(
  'Subscription',
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
    plan_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(SUBSCRIPTION_STATUS)),
      allowNull: false,
      defaultValue: SUBSCRIPTION_STATUS.ACTIVE,
    },
    starts_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    ends_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  { tableName: 'subscriptions' }
);

User.hasMany(Subscription, { foreignKey: 'user_id', as: 'subscriptions' });
Subscription.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Subscription.belongsTo(SubscriptionPlan, { foreignKey: 'plan_id', as: 'plan' });
SubscriptionPlan.hasMany(Subscription, { foreignKey: 'plan_id', as: 'subscriptions' });

export { SubscriptionPlan, Subscription };
