import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { CATALOG_STATUS, TRUST_LEVEL } from '../constants/index.js';
import { FileAsset } from './FileAsset.js';

const University = sequelize.define(
  'University',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    slug: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    official_site: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(CATALOG_STATUS)),
      allowNull: false,
      defaultValue: CATALOG_STATUS.ACTIVE,
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    logo_file_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  { tableName: 'universities' }
);

const Faculty = sequelize.define(
  'Faculty',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    university_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(CATALOG_STATUS)),
      allowNull: false,
      defaultValue: CATALOG_STATUS.ACTIVE,
    },
  },
  { tableName: 'faculties', indexes: [{ unique: true, fields: ['university_id', 'slug'] }] }
);

const Specialty = sequelize.define(
  'Specialty',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    faculty_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    profession_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    contract_cost: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(CATALOG_STATUS)),
      allowNull: false,
      defaultValue: CATALOG_STATUS.ACTIVE,
    },
  },
  { tableName: 'specialties', indexes: [{ unique: true, fields: ['faculty_id', 'slug'] }] }
);

const ProgramRule = sequelize.define(
  'ProgramRule',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    specialty_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    season_year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    ort_required: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    main_score_min: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    subject_requirements_json: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    extra_exam_required: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    grant_category_scope_json: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    source_url: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    trust_level: {
      type: DataTypes.ENUM(...Object.values(TRUST_LEVEL)),
      allowNull: false,
      defaultValue: TRUST_LEVEL.MEDIUM,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  { tableName: 'program_rules' }
);

const PassingScoreSnapshot = sequelize.define(
  'PassingScoreSnapshot',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    program_rule_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    budget_cutoff: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
    },
    contract_cutoff: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
    },
    seats_budget: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    seats_contract: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    source_url: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    trust_level: {
      type: DataTypes.ENUM(...Object.values(TRUST_LEVEL)),
      allowNull: false,
      defaultValue: TRUST_LEVEL.MEDIUM,
    },
  },
  { tableName: 'passing_score_snapshots' }
);

University.hasMany(Faculty, { foreignKey: 'university_id', as: 'faculties' });
University.belongsTo(FileAsset, { foreignKey: 'logo_file_id', as: 'logo' });
Faculty.belongsTo(University, { foreignKey: 'university_id', as: 'university' });
Faculty.hasMany(Specialty, { foreignKey: 'faculty_id', as: 'specialties' });
Specialty.belongsTo(Faculty, { foreignKey: 'faculty_id', as: 'faculty' });
Specialty.hasMany(ProgramRule, { foreignKey: 'specialty_id', as: 'programRules' });
ProgramRule.belongsTo(Specialty, { foreignKey: 'specialty_id', as: 'specialty' });
ProgramRule.hasMany(PassingScoreSnapshot, { foreignKey: 'program_rule_id', as: 'passingScores' });
PassingScoreSnapshot.belongsTo(ProgramRule, { foreignKey: 'program_rule_id', as: 'programRule' });

export {
  University,
  Faculty,
  Specialty,
  ProgramRule,
  PassingScoreSnapshot,
};
