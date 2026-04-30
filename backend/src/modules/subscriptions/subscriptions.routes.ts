import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { tenantScope } from '../../middleware/tenantScope';
import { subscriptionsService } from './subscriptions.service';
import { successResponse, errorResponse } from '../../utils/response';

const router = Router();

// ─── Public: validate a coupon (used on the Pricing page) ───────────────────
router.post('/validate-coupon', async (req, res) => {
  try {
    const body = z
      .object({
        code: z.string().min(1).max(50),
        plan: z.enum(['solo', 'pro', 'business']).optional(),
        province: z.enum(['QC', 'ON', 'AB', 'BC']).optional(),
      })
      .parse(req.body);
    const result = await subscriptionsService.validateCoupon(body);
    res.json(successResponse(result));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json(errorResponse('Invalid request body', 'VALIDATION_ERROR'));
    }
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

// ─── Authenticated: start an upgrade checkout session ───────────────────────
router.post('/upgrade', authenticate, tenantScope, requireRole('account_owner'), async (req, res) => {
  try {
    const body = z
      .object({
        plan: z.enum(['solo', 'pro', 'business']),
        discountCode: z.string().trim().min(1).max(50).optional(),
      })
      .parse(req.body);
    const result = await subscriptionsService.createUpgradeCheckoutSession({
      accountId: req.user!.accountId!,
      userId: req.user!.userId,
      plan: body.plan,
      discountCode: body.discountCode,
    });
    res.json(successResponse(result));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json(errorResponse('Invalid request body', 'VALIDATION_ERROR'));
    }
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

export default router;
