import { DEVICE_TYPE } from '../constants/index.js';

export function detectDeviceType(userAgent = '') {
  const ua = userAgent.toLowerCase();
  const mobilePattern = /mobile|android|iphone|ipad|ipod|webos|blackberry|iemobile|opera mini/i;
  return mobilePattern.test(ua) ? DEVICE_TYPE.MOBILE : DEVICE_TYPE.DESKTOP;
}

export function parseUserAgent(userAgent = '') {
  let browser = 'unknown';
  let os = 'unknown';

  if (/windows/i.test(userAgent)) os = 'Windows';
  else if (/mac os/i.test(userAgent)) os = 'macOS';
  else if (/android/i.test(userAgent)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(userAgent)) os = 'iOS';
  else if (/linux/i.test(userAgent)) os = 'Linux';

  if (/edg\//i.test(userAgent)) browser = 'Edge';
  else if (/chrome\//i.test(userAgent)) browser = 'Chrome';
  else if (/firefox\//i.test(userAgent)) browser = 'Firefox';
  else if (/safari\//i.test(userAgent) && !/chrome/i.test(userAgent)) browser = 'Safari';

  return { browser, os };
}
