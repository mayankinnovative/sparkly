import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response';

/**
 * Injects accountId from the authenticated user's token into req for tenant scoping.
 * All downstream service calls must use this accountId for data isolation.
 */
export function tenantScope(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json(errorResponse('Authentication required', 'UNAUTHORIZED'));
    return;
  }

  // Super admin has no tenant scope — they use admin routes
  if (req.user.role === 'super_admin') {
    next();
    return;
  }

  if (!req.user.accountId) {
    res.status(403).json(
      errorResponse('No account associated with this user', 'NO_TENANT')
    );
    return;
  }

  next();
}
