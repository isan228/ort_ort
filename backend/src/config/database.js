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
  // alter: true ломает ENUM+UNIQUE в PostgreSQL (Sequelize bug). В production — только create missing.
  const useAlter = config.db.syncAlter && config.env !== 'production';
  const options = useAlter ? { alter: true } : {};
  await import('../models/index.js');
  await sequelize.sync(options);
  const { applySchemaPatches } = await import('./schemaPatches.js');
  await applySchemaPatches();
  console.log(useAlter ? 'Database synced (alter)' : 'Database synced');
}
