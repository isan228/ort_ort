import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { TUTOR_LINK_PLATFORM, TUTOR_LINK_STATUS } from '../constants/index.js';

const TutorLink = sequelize.define(
  'TutorLink',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    platform: {
      type: DataTypes.ENUM(...Object.values(TUTOR_LINK_PLATFORM)),
      allowNull: false,
      defaultValue: TUTOR_LINK_PLATFORM.TELEGRAM,
    },
    url: {
      type: DataTypes.STRING(512),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    responsible_tutor: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    program_scope: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    icon: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(TUTOR_LINK_STATUS)),
      allowNull: false,
      defaultValue: TUTOR_LINK_STATUS.ACTIVE,
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  { tableName: 'tutor_links' }
);

export { TutorLink };
