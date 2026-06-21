import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3001,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'ort_kg',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    syncAlter: process.env.DB_SYNC_ALTER === 'true',
  },
  timezone: process.env.TZ || 'Asia/Bishkek',
  payment: {
    provider: (process.env.PAYMENT_PROVIDER || 'stub').toLowerCase(),
  },
  finik: {
    apiKey: process.env.FINIK_API_KEY || '',
    accountId: process.env.FINIK_ACCOUNT_ID || '',
    qrNameEn: process.env.FINIK_QR_NAME_EN || 'ort-kg-premium',
    baseUrl: process.env.FINIK_BASE_URL || 'https://api.acquiring.averspay.kg',
    privateKeyPem: process.env.FINIK_PRIVATE_PEM || '',
    privateKeyPath: process.env.FINIK_PRIVATE_KEY_PATH || '',
    publicKeyPem: process.env.FINIK_PUBLIC_PEM || '',
    publicKeyPath: process.env.FINIK_PUBLIC_KEY_PATH || '',
    webhookPath: process.env.FINIK_WEBHOOK_PATH || '/api/v1/payments/finik/webhook',
    timestampSkewMs: Number(process.env.FINIK_TIMESTAMP_SKEW_MS || 5 * 60 * 1000),
  },
};
