import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/** Корень монорепо (ort/), не backend/ */
export const projectRoot = path.resolve(__dirname, '../../..');

function resolveKeyFile(envPath, defaultNames) {
  if (envPath) return envPath;
  for (const name of defaultNames) {
    const candidate = path.join(projectRoot, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return path.join(projectRoot, defaultNames[0]);
}

function resolveClientUrl() {
  const env = process.env.NODE_ENV || 'development';
  const fallback = env === 'production' ? 'https://ort.kg' : 'http://localhost:5173';
  const raw = process.env.PUBLIC_APP_URL || process.env.CLIENT_URL || fallback;
  const url = raw.replace(/\/$/, '');

  if (env === 'production' && /localhost|127\.0\.0\.1/.test(url)) {
    console.warn(
      `[config] CLIENT_URL=${url} недопустим для production — Finik redirect будет https://ort.kg`
    );
    return 'https://ort.kg';
  }

  return url;
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3001,
  /** Публичный URL сайта: CORS, Finik RedirectUrl, webhook callback base */
  clientUrl: resolveClientUrl(),
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
    privateKeyPath: resolveKeyFile(process.env.FINIK_PRIVATE_KEY_PATH, [
      'finik_private.pem',
      'private.pem',
      'finik-private.pem',
    ]),
    publicKeyPem: process.env.FINIK_PUBLIC_PEM || '',
    publicKeyPath: resolveKeyFile(process.env.FINIK_PUBLIC_KEY_PATH, [
      'finik_public.pem',
      'public.pem',
      'finik-public.pem',
    ]),
    webhookPath: process.env.FINIK_WEBHOOK_PATH || '/api/v1/payments/finik/webhook',
    timestampSkewMs: Number(process.env.FINIK_TIMESTAMP_SKEW_MS || 5 * 60 * 1000),
  },
};
