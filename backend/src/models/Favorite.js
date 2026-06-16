import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { FAVORITE_ENTITY_TYPE } from '../constants/index.js';
import { User } from './User.js';

const Favorite = sequelize.define(
  'Favorite',
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
    entity_type: {
      type: DataTypes.ENUM(...Object.values(FAVORITE_ENTITY_TYPE)),
      allowNull: false,
    },
    entity_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  },
  {
    tableName: 'favorites',
    indexes: [{ unique: true, fields: ['user_id', 'entity_type', 'entity_id'] }],
  }
);

const ComparisonSet = sequelize.define(
  'ComparisonSet',
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
    name: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    items_json: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
  },
  { tableName: 'comparison_sets' }
);

User.hasMany(Favorite, { foreignKey: 'user_id', as: 'favorites' });
Favorite.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(ComparisonSet, { foreignKey: 'user_id', as: 'comparisonSets' });
ComparisonSet.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export { Favorite, ComparisonSet };
