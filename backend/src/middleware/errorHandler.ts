import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/response';
import { errorResponse } from '../utils/response';
import { logger } from '../config/logger';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json(errorResponse(err.message, err.code));
    return;
  }

  logger.error({ err }, 'Unhandled error');

  res.status(500).json(
    errorResponse('Internal server error', 'INTERNAL_ERROR')
  );
}
