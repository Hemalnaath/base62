import rateLimit from 'express-rate-limit';

/**
 * Global general rate limiter: max 100 requests per 15-minute window.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 100,
  message: {
    error: 'Too many general requests. Limit is 100 requests per 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Authentication rate limiter: max 10 requests per 15-minute window on auth routes.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 10,
  message: {
    error: 'Too many authentication attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * URL creation rate limiter: max 30 requests per minute on POST /api/urls.
 */
export const createUrlLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: {
    error: 'Too many URL creations. Limit is 30 requests per minute.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
