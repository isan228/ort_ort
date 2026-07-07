import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { ADMISSION_FUNDING_TYPE, ADMISSION_REGION_CATEGORY } from '../constants/index.js';

const AdmissionStatistic = sequelize.define(
  'AdmissionStatistic',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    university_slug: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    academic_year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    specialty_slug: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    specialty_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    funding_type: {
      type: DataTypes.ENUM(...Object.values(ADMISSION_FUNDING_TYPE)),
      allowNull: false,
    },
    tour: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    region_category: {
      type: DataTypes.ENUM(...Object.values(ADMISSION_REGION_CATEGORY)),
      allowNull: true,
    },
    score_min: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
    },
    score_max: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
    },
    score: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
    },
    source_note: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
  },
  {
    tableName: 'admission_statistics',
    indexes: [
      {
        unique: true,
        fields: [
          'university_slug',
          'academic_year',
          'specialty_slug',
          'funding_type',
          'tour',
          'region_category',
        ],
        name: 'admission_statistics_unique_key',
      },
    ],
  }
);

export { AdmissionStatistic };
