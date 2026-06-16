import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const FaqItem = sequelize.define(
  'FaqItem',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    category: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    locale: {
      type: DataTypes.STRING(8),
      allowNull: false,
      defaultValue: 'ru',
    },
    question: {
      type: DataTypes.STRING(512),
      allowNull: false,
    },
    answer: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    is_published: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  { tableName: 'faq_items' }
);

export { FaqItem };
