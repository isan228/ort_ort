import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { PROMO_DISCOUNT_TYPE } from '../constants/index.js';
import { User } from './User.js';

const PromoCode = sequelize.define(
  'PromoCode',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING(32),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    discount_type: {
      type: DataTypes.ENUM(...Object.values(PROMO_DISCOUNT_TYPE)),
      allowNull: false,
      defaultValue: PROMO_DISCOUNT_TYPE.PERCENT,
    },
    discount_value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    max_uses: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    used_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  { tableName: 'promo_codes' }
);

const PromoCodeUse = sequelize.define(
  'PromoCodeUse',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    promo_code_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    payment_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    discount_applied_kgs: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  { tableName: 'promo_code_uses' }
);

User.hasMany(PromoCode, { foreignKey: 'created_by', as: 'createdPromoCodes' });
PromoCode.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
PromoCode.hasMany(PromoCodeUse, { foreignKey: 'promo_code_id', as: 'uses' });
PromoCodeUse.belongsTo(PromoCode, { foreignKey: 'promo_code_id', as: 'promoCode' });
PromoCodeUse.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export { PromoCode, PromoCodeUse };
