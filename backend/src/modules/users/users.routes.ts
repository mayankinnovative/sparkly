import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { tenantScope } from '../../middleware/tenantScope';
import { validate } from '../../middleware/validate';
import { usersService } from './users.service';
import { createUserSchema, updateUserSchema, updateMeSchema } from './users.schema';
import { successResponse, errorResponse } from '../../utils/response';
import prisma from '../../config/database';

const router = Router();

router.use(authenticate, tenantScope);

router.get(
  '/',
  requireRole('account_owner'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await usersService.list(req.user!.accountId);
      res.json(successResponse(users));
    } catch (error) { next(error); }
  }
);

router.patch(
  '/me',
  validate(updateMeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await usersService.updateMe(req.user!.userId, req.body);
      res.json(successResponse(user, 'Profile updated'));
    } catch (error) { next(error); }
  }
);

router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isSelf = req.params.id === req.user!.userId;
      if (!isSelf && req.user!.role !== 'account_owner' && req.user!.role !== 'super_admin') {
        return res.status(403).json({ success: false, data: null, message: 'Insufficient permissions', error: { code: 'INSUFFICIENT_ROLE' } });
      }
      const user = await usersService.getById(req.user!.accountId, req.params.id as string);
      res.json(successResponse(user));
    } catch (error) { next(error); }
  }
);

router.post(
  '/',
  requireRole('account_owner'),
  validate(createUserSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await usersService.create(req.user!.accountId, req.body);
      res.status(201).json(successResponse(user, 'User created'));
    } catch (error) { next(error); }
  }
);

router.patch(
  '/:id',
  requireRole('account_owner'),
  validate(updateUserSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await usersService.update(req.user!.accountId, req.params.id as string, req.body);
      res.json(successResponse(user, 'User updated'));
    } catch (error) { next(error); }
  }
);

router.delete(
  '/:id',
  requireRole('account_owner'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await usersService.deactivate(req.user!.accountId, req.params.id as string);
      res.status(204).send();
    } catch (error) { next(error); }
  }
);

// ─── Change Requests (non-admin) ────────────────────────────────────────────
// Account owners can submit a change request (e.g. province change).
// Staff/accountants cannot — they should ask the account owner.
router.get('/me/change-requests', async (req: Request, res: Response) => {
  try {
    const requests = await prisma.changeRequest.findMany({
      where: { accountId: req.user!.accountId || undefined },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json(successResponse(requests));
  } catch (err: any) {
    res.status(err.statusCode || 500).json(errorResponse(err.message, err.code));
  }
});

router.post('/me/change-requests', requireRole('account_owner'), async (req: Request, res: Response) => {
  try {
    const { requestType, requestedValue, reason } = req.body;
    if (!requestType || !requestedValue) {
      return res.status(400).json(errorResponse('requestType and requestedValue are required', 'MISSING_PARAMS'));
    }
    if (requestType === 'province_change' && !['QC', 'ON'].includes(requestedValue)) {
      return res.status(400).json(errorResponse('requestedValue must be "QC" or "ON" for province_change', 'INVALID_PROVINCE'));
    }
    const accountId = req.user!.accountId;
    if (!accountId) {
      return res.status(400).json(errorResponse('No account context', 'NO_ACCOUNT'));
    }

    // Reject if there's already a pending request of the same type for this account
    const existing = await prisma.changeRequest.findFirst({
      where: { accountId, requestType, status: 'pending' },
    });
    if (existing) {
      return res.status(409).json(errorResponse('A pending request of this type already exists', 'PENDING_EXISTS'));
    }

    let currentValue: string | null = null;
    if (requestType === 'province_change') {
      const account = await prisma.account.findUnique({ where: { id: accountId } });
      currentValue = account?.province || null;
    }

    const created = await prisma.changeRequest.create({
      data: {
        accountId,
        requestedBy: req.user!.userId,
        requestType,
        currentValue,
        requestedValue,
        reason: reason || null,
        status: 'pending',
      },
    });
    res.status(201).json(successResponse(created, 'Change request submitted'));
  } catch (err: any) {
    res.status(err.statusCode || 500).json(errorResponse(err.message, err.code));
  }
});

export default router;
