import { Request, Response, NextFunction } from 'express';

/**
 * Universal error interceptor for Express, formatting uncaught exceptions safely in JSON.
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('[Global Error Interceptor]', err);

  const statusCode = err.status || err.statusCode || 500;
  const errMsg = err.message || 'An unexpected server error occurred.';

  res.status(statusCode).json({
    error: errMsg,
    code: err.code || 'INTERNAL_SERVER_ERROR',
    status: statusCode,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}
export default errorHandler;
