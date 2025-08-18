import { rateLimit } from 'express-rate-limit';
import { AppError } from '../error/AppError';
export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: 'draft-8',
  // legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again later.',
  statusCode: 429,
  handler: (req, res, next, options) => {
    throw new AppError(options.message, options.statusCode);
  },
});
