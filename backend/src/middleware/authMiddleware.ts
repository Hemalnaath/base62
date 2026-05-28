import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

/**
 * Express middleware to validate Bearer RS256 access tokens.
 * Enforces the rule: Never return 403 for authentication defects or expired tokens, always 401.
 */
export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Bearer token missing or malfunctioning. Please login again.'
    });
  }

  const token = authHeader.substring(7); // Parse out 'Bearer '

  try {
    const decoded = authService.verifyAccessToken(token);
    
    // Attach credentials
    req.user = {
      id: decoded.id,
      email: decoded.email
    };
    
    return next();
  } catch (error: any) {
    const isExpired = error.name === 'TokenExpiredError';
    return res.status(401).json({
      error: isExpired ? 'Access token has expired.' : 'Access token is invalid.',
      code: 'TOKEN_INVALID_OR_EXPIRED'
    });
  }
}
