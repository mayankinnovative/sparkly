import { Request, Response, NextFunction } from 'express';
import { Plan, UserRole } from '@prisma/client';
import prisma from '../config/database';
import { PLAN_HIERARCHY } from '../types';
import { errorResponse } from '../utils/response';

export function requirePlan(minimumPlan: Plan) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json(errorResponse('Authentication required', 'UNAUTHORIZED'));
      return;
    }

    // Super admin bypasses plan checks
    if (req.user.role === 'super_admin') {
      next();
      return;
    }

    if (!req.user.accountId) {
      res.status(403).json(errorResponse('No account associated', 'NO_ACCOUNT'));
      return;
    }

    const account = await prisma.account.findUnique({
      where: { id: req.user.accountId },
      select: { plan: true },
    });

    if (!account) {
      res.status(404).json(errorResponse('Account not found', 'ACCOUNT_NOT_FOUND'));
      return;
    }

    if (PLAN_HIERARCHY[account.plan] < PLAN_HIERARCHY[minimumPlan]) {
      res.status(403).json(
        errorResponse(
          `This feature requires the ${minimumPlan} plan or higher`,
          'PLAN_INSUFFICIENT'
        )
      );
      return;
    }

    // Check role entitlements under plan
    const role = req.user.role;
    if (role === 'staff' && account.plan === 'solo') {
      res.status(403).json(
        errorResponse('Staff users require Pro plan or above', 'ROLE_NOT_IN_PLAN')
      );
      return;
    }

    if (role === 'accountant' && account.plan !== 'business') {
      res.status(403).json(
        errorResponse('Accountant role requires Business plan', 'ROLE_NOT_IN_PLAN')
      );
      return;
    }

    next();
  };
}
