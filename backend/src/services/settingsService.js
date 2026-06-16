import { Setting } from '../models/index.js';

const cache = new Map();

export async function getSetting(key, fallback = null) {
  if (cache.has(key)) {
    return cache.get(key);
  }

  const row = await Setting.findOne({ where: { key } });
  const value = row ? row.value : fallback;
  cache.set(key, value);
  return value;
}

export async function getAuthLoginMode() {
  return getSetting('auth_login_mode', 'phone_or_email');
}

export function clearSettingsCache() {
  cache.clear();
}
