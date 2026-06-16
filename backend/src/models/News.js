import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { NEWS_STATUS } from '../constants/index.js';

const NewsArticle = sequelize.define(
  'NewsArticle',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    slug: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(NEWS_STATUS)),
      allowNull: false,
      defaultValue: NEWS_STATUS.DRAFT,
    },
    published_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    excerpt: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  { tableName: 'news_articles' }
);

export { NewsArticle };
