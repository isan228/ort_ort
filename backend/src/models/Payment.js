import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { PAYMENT_STATUS } from '../constants/index.js';
import { User } from './User.js';
import { SubscriptionPlan } from './Subscription.js';

const Payment = sequelize.define(
  'Payment',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    plan_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    amount_kgs: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(PAYMENT_STATUS)),
      allowNull: false,
      defaultValue: PAYMENT_STATUS.PENDING,
    },
    provider: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: 'stub',
    },
    provider_payment_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  { tableName: 'payments' }
);

User.hasMany(Payment, { foreignKey: 'user_id', as: 'payments' });
Payment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Payment.belongsTo(SubscriptionPlan, { foreignKey: 'plan_id', as: 'plan' });

export { Payment };
