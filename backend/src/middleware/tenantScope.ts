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

  // Super admin has no fixed tenant scope, but they may pass ?accountId=<uuid>
  // (or X-Account-Id header) to act on a specific tenant's data — for example
  // when navigating into a tenant from the Super Admin panel.
  if (req.user.role === 'super_admin') {
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const candidate = (req.query.accountId as string | undefined)
      || (req.headers['x-account-id'] as string | undefined);
    if (candidate && uuidRe.test(candidate)) {
      req.user.accountId = candidate;
    }
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
