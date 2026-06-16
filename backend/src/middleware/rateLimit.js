import { createHttpError } from '../utils/errors.js';

const buckets = new Map();

export function rateLimit({ windowMs = 60_000, max = 10, keyPrefix = '', keyFn = (req) => req.ip || 'unknown' }) {
  return (req, _res, next) => {
    const key = `${keyPrefix}:${keyFn(req)}`;
    const now = Date.now();

    let bucket = buckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    if (bucket.count > max) {
      return next(createHttpError(429, 'RATE_LIMIT', 'Слишком много запросов, попробуйте позже'));
    }

    next();
  };
}
