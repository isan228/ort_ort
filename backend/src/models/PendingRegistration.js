import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { PENDING_REGISTRATION_STATUS } from '../constants/index.js';
import { Payment } from './Payment.js';

const PendingRegistration = sequelize.define(
  'PendingRegistration',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    payment_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    full_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    main_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    subject_scores_json: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    consents: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    referral_code: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    certificate_storage_key: {
      type: DataTypes.STRING(512),
      allowNull: false,
    },
    certificate_mime: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    certificate_size: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(PENDING_REGISTRATION_STATUS)),
      allowNull: false,
      defaultValue: PENDING_REGISTRATION_STATUS.PENDING,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    session_issued_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  { tableName: 'pending_registrations' }
);

PendingRegistration.belongsTo(Payment, { foreignKey: 'payment_id', as: 'payment' });
Payment.hasOne(PendingRegistration, { foreignKey: 'payment_id', as: 'pendingRegistration' });

export { PendingRegistration };
