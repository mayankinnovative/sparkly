import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      timezone?: string;
    }
  }
}

/**
 * Extracts timezone from request headers.
 * Priority:
 *   1. x-vercel-ip-timezone (Vercel production – IP-based)
 *   2. x-timezone (browser-detected, sent by frontend)
 *   3. Fallback: UTC
 */
export function detectTimezone(req: Request, _res: Response, next: NextFunction): void {
  const vercelTz = req.headers['x-vercel-ip-timezone'] as string | undefined;
  const clientTz = req.headers['x-timezone'] as string | undefined;
  req.timezone = vercelTz || clientTz || 'UTC';
  next();
}
