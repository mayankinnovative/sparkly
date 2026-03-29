import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { tenantScope } from '../../middleware/tenantScope';
import { validate } from '../../middleware/validate';
import { usersService } from './users.service';
import { createUserSchema, updateUserSchema } from './users.schema';
import { successResponse } from '../../utils/response';

const router = Router();

router.use(authenticate, tenantScope);

router.get(
  '/',
  requireRole('account_owner'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await usersService.list(req.user!.accountId!);
      res.json(successResponse(users));
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
      const user = await usersService.getById(req.user!.accountId!, req.params.id as string);
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
      const user = await usersService.create(req.user!.accountId!, req.body);
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
      const user = await usersService.update(req.user!.accountId!, req.params.id as string, req.body);
      res.json(successResponse(user, 'User updated'));
    } catch (error) { next(error); }
  }
);

router.delete(
  '/:id',
  requireRole('account_owner'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await usersService.deactivate(req.user!.accountId!, req.params.id as string);
      res.status(204).send();
    } catch (error) { next(error); }
  }
);

export default router;
