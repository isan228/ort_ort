import { Sequelize } from 'sequelize';
import { config } from '../config/index.js';

export const sequelize = new Sequelize(config.db.name, config.db.user, config.db.password, {
  host: config.db.host,
  port: config.db.port,
  dialect: 'postgres',
  logging: config.env === 'development' ? console.log : false,
  timezone: config.timezone,
  define: {
    underscored: true,
    timestamps: true,
  },
});

export async function connectDatabase() {
  await sequelize.authenticate();
  console.log('PostgreSQL connected');
}

export async function syncDatabase() {
  const options = config.db.syncAlter ? { alter: true } : {};
  await sequelize.sync(options);
  console.log('Database synced');
}
