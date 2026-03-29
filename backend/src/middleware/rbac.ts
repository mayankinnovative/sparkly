import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { ROLE_HIERARCHY } from '../types';
import { errorResponse } from '../utils/response';

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(errorResponse('Authentication required', 'UNAUTHORIZED'));
      return;
    }

    const userRoleLevel = ROLE_HIERARCHY[req.user.role];
    const hasAccess = allowedRoles.some(
      (role) => userRoleLevel >= ROLE_HIERARCHY[role]
    );

    if (!hasAccess) {
      res.status(403).json(
        errorResponse('Insufficient role permissions', 'INSUFFICIENT_ROLE')
      );
      return;
    }

    next();
  };
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'super_admin') {
    res.status(403).json(errorResponse('Super Admin access required', 'SUPER_ADMIN_ONLY'));
    return;
  }
  next();
}
