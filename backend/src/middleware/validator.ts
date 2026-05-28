import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Common middleware handler to report express-validator anomalies.
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array().map((err: any) => ({
        field: err.path || err.param,
        message: err.msg
      }))
    });
  }
  return next();
};

/**
 * Signup form request validator:
 * Ensure valid email structure and robust password (min 8 chars, 1 upper case letter, 1 number).
 */
export const signupValidator = [
  body('email')
    .isEmail()
    .withMessage('Please specify a valid email address.')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long.')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least 1 uppercase letter.')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least 1 number.'),
  handleValidationErrors
];

/**
 * Login structural validation.
 */
export const loginValidator = [
  body('email')
    .isEmail()
    .withMessage('Please specify a valid email address.')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password must not be empty.'),
  handleValidationErrors
];

/**
 * URL Creation payload validations:
 * - Must be validated with JS "URL" constructor whitelisting HTTP/HTTPS.
 * - Custom aliases: length 8 to 100, characters [a-zA-Z0-9-_]. No reserved keywords.
 * - Expiration: must be a future timestamp.
 */
export const urlValidator = [
  body('original_url')
    .trim()
    .notEmpty()
    .withMessage('Destination long URL is required.')
    .custom((val) => {
      try {
        const url = new URL(val);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          throw new Error('Protocol not supported. Only http:// and https:// links are acceptable.');
        }
        return true;
      } catch (err: any) {
        throw new Error(err.message || 'Invalid original URL formatting.');
      }
    }),
  body('custom_alias')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 8, max: 100 })
    .withMessage('Custom alias length must range between 8 and 100 characters.')
    .matches(/^[a-zA-Z0-9\-_]+$/)
    .withMessage('Custom alias permits alphanumeric keys, dashes, and underscores only.')
    .custom((val) => {
      const reserved = [
        'api', 'admin', 'login', 'signup', 'dashboard', 'analytics', 'health',
        'static', 'assets', 'favicon', 'robots', 'sitemap', 'null', 'undefined'
      ];
      if (reserved.includes(val.toLowerCase())) {
        throw new Error('This word is reserved by the application routing layer.');
      }
      return true;
    }),
  body('expires_at')
    .optional({ checkFalsy: true })
    .custom((val) => {
      const date = new Date(val);
      if (isNaN(date.getTime())) {
        throw new Error('Provided expiration date is invalid.');
      }
      if (date.getTime() <= Date.now()) {
        throw new Error('Url expiration date must be scheduled in the future.');
      }
      return true;
    }),
  body('is_public')
    .optional()
    .isBoolean()
    .withMessage('is_public must be a true/false boolean flag.'),
  handleValidationErrors
];
