import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import {
  USER_STATUS,
  USER_PHASE,
  PUBLIC_DISPLAY_MODE,
} from '../constants/index.js';
import { Role } from './Role.js';

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },
    phone: {
      type: DataTypes.STRING(32),
      allowNull: true,
      unique: true,
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(USER_STATUS)),
      allowNull: false,
      defaultValue: USER_STATUS.ACTIVE,
    },
    phase: {
      type: DataTypes.ENUM(...Object.values(USER_PHASE)),
      allowNull: false,
      defaultValue: USER_PHASE.AFTER_RESULTS,
    },
    admitted_flag: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    trial_analyses_used: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    trial_analyses_limit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
    },
  },
  { tableName: 'users' }
);

const Profile = sequelize.define(
  'Profile',
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
    full_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    nickname: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    certificate_number: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    public_display_mode: {
      type: DataTypes.ENUM(...Object.values(PUBLIC_DISPLAY_MODE)),
      allowNull: false,
      defaultValue: PUBLIC_DISPLAY_MODE.NICKNAME,
    },
  },
  { tableName: 'profiles' }
);

Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
User.hasOne(Profile, { foreignKey: 'user_id', as: 'profile' });
Profile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export { User, Profile };
