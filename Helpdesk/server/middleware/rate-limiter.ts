import rateLimit from 'express-rate-limit';
import { Request } from 'express';

/**
 * Check if the application is running in a production environment.
 */
export const isProductionEnvironment = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

/**
 * General API Rate Limiter
 * Enforces rate limiting strictly in production environment.
 * Bypassed in development, test, and non-production environments.
 * Health check endpoint is also exempted to avoid disrupting monitoring tools.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes default window
  limit: () => Number(process.env.RATE_LIMIT_MAX) || 100, // 100 requests per window (configurable via RATE_LIMIT_MAX)
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req: Request) => !isProductionEnvironment() || req.path === '/health' || req.path === '/api/health',
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again later.',
  },
  validate: {
    trustProxy: false,
  },
});

/**
 * Sensitive Endpoints Rate Limiter (Authentication)
 * Stricter limit for login/auth routes to prevent brute-force attacks in production.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes default window
  limit: () => Number(process.env.AUTH_RATE_LIMIT_MAX) || 20, // 20 requests per window (configurable via AUTH_RATE_LIMIT_MAX)
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => !isProductionEnvironment(),
  message: {
    error: 'Too Many Requests',
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.',
  },
  validate: {
    trustProxy: false,
  },
});

/**
 * Public Ticket Submission Rate Limiter
 * Protects public ticket creation from spam and automated flooding in production.
 */
export const ticketCreationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute default window
  limit: () => Number(process.env.TICKET_RATE_LIMIT_MAX) || 10, // 10 tickets per minute (configurable via TICKET_RATE_LIMIT_MAX)
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => !isProductionEnvironment(),
  message: {
    error: 'Too Many Requests',
    message: 'Too many tickets submitted from this IP. Please wait a moment before trying again.',
  },
  validate: {
    trustProxy: false,
  },
});
