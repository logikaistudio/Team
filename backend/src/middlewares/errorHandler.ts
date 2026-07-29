import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../utils/errors';
import { logger } from '../utils/logger';
import { config } from '../config';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const isPayloadTooLarge = err.name === 'MulterError' || /payload too large|file too large|request entity too large/i.test(err.message || '');
  const statusCode = err instanceof HttpError ? err.statusCode : isPayloadTooLarge ? 413 : 500;
  const message = err.message || 'Internal Server Error';

  logger.error('Error handled by middleware', {
    method: req.method,
    url: req.url,
    statusCode,
    message,
    stack: config.nodeEnv === 'development' ? err.stack : undefined,
  });

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
}
