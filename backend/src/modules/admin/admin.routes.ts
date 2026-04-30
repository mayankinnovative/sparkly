import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireSuperAdmin } from '../../middleware/rbac';
import { adminService } from './admin.service';
import { successResponse, errorResponse } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const router = Router();

router.use(authenticate, requireSuperAdmin);

router.get('/stats', async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    const stats = await adminService.getPlatformStats(userId);
    res.json(successResponse(stats));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.get('/accounts', async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    const page = parseInt(req.query.page as string, 10) || 1;
    const pageSize = parseInt(req.query.pageSize as string, 10) || 20;
    const data = await adminService.listAccounts(userId, page, pageSize);
    res.json(successResponse(data));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.get('/accounts/:id', async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    const account = await adminService.getAccountDetails(userId, req.params.id);
    res.json(successResponse(account));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.post('/accounts/:id/suspend', async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    const { reason } = req.body;
    await adminService.suspendAccount(userId, req.params.id, reason || 'Suspended by admin');
    res.json(successResponse(null, 'Account suspended'));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.post('/accounts/:id/reactivate', async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    await adminService.reactivateAccount(userId, req.params.id);
    res.json(successResponse(null, 'Account reactivated'));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.post('/accounts/:id/change-plan', async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    const { plan } = req.body;
    if (!plan || !['solo', 'pro', 'business'].includes(plan)) {
      return res.status(400).json(errorResponse('Valid plan is required (solo, pro, business)', 'INVALID_PLAN'));
    }
    await adminService.changePlan(userId, req.params.id, plan);
    res.json(successResponse(null, `Plan changed to ${plan}`));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.get('/audit-log', async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    const page = parseInt(req.query.page as string, 10) || 1;
    const data = await adminService.getAuditLog(userId, page);
    res.json(successResponse(data));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.get('/scheduler-logs', async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    const page = parseInt(req.query.page as string, 10) || 1;
    const data = await adminService.getSchedulerLogs(userId, page);
    res.json(successResponse(data));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

// FR-ADM-10: Update tax configuration for a province
router.put('/tax-configs/:province', async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    const { province } = req.params;
    const { taxYear, rates } = req.body;
    if (!taxYear || !rates) {
      return res.status(400).json(errorResponse('taxYear and rates are required', 'MISSING_PARAMS'));
    }
    const config = await adminService.updateTaxConfig(userId, province, taxYear, rates);
    res.json(successResponse(config, 'Tax configuration updated'));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

// KPI stats (MRR, churn, etc.)
router.get('/kpi', async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    const data = await adminService.getKpiStats(userId);
    res.json(successResponse(data));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

// Reset password for a user
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json(errorResponse('Password must be at least 8 characters', 'INVALID_PASSWORD'));
    }
    await adminService.resetUserPassword(userId, req.params.id, newPassword);
    res.json(successResponse(null, 'Password reset successfully'));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

// FR-ADM-06: Login-as / impersonation route is intentionally NOT exposed.
// Super Admin must not be able to log in as a tenant user.

// Discount codes
router.get('/discount-codes', async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    const codes = await adminService.listDiscountCodes(userId);
    res.json(successResponse(codes));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.post('/discount-codes', async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    const { code, discountType, discountValue, maxUses, expiresAt } = req.body;
    if (!code || !discountType || discountValue == null) {
      return res.status(400).json(errorResponse('code, discountType, and discountValue are required', 'MISSING_PARAMS'));
    }
    if (!['percentage', 'fixed'].includes(discountType)) {
      return res.status(400).json(errorResponse('discountType must be percentage or fixed', 'INVALID_TYPE'));
    }
    const result = await adminService.createDiscountCode(userId, { code, discountType, discountValue: parseFloat(discountValue), maxUses: maxUses ? parseInt(maxUses) : undefined, expiresAt });
    res.status(201).json(successResponse(result));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.put('/discount-codes/:id', async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    const { code, discountType, discountValue, maxUses, expiresAt } = req.body;
    if (discountType && !['percentage', 'fixed'].includes(discountType)) {
      return res.status(400).json(errorResponse('discountType must be percentage or fixed', 'INVALID_TYPE'));
    }
    const result = await adminService.updateDiscountCode(userId, req.params.id, {
      code,
      discountType,
      discountValue: discountValue != null ? parseFloat(discountValue) : undefined,
      maxUses: maxUses === '' || maxUses === null ? null : maxUses ? parseInt(maxUses) : undefined,
      expiresAt: expiresAt === '' ? null : expiresAt,
    });
    res.json(successResponse(result));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.patch('/discount-codes/:id/toggle', async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    const result = await adminService.toggleDiscountCode(userId, req.params.id);
    res.json(successResponse(result));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.delete('/discount-codes/:id', async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    await adminService.deleteDiscountCode(userId, req.params.id);
    res.json(successResponse(null, 'Discount code deleted'));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

// Platform settings
router.get('/settings', async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    const settings = await adminService.getPlatformSettings(userId);
    res.json(successResponse(settings));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.put('/settings/:key', async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    const { value } = req.body;
    if (value === undefined) {
      return res.status(400).json(errorResponse('value is required', 'MISSING_PARAMS'));
    }
    const setting = await adminService.upsertPlatformSetting(userId, req.params.key, value);
    res.json(successResponse(setting));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

// Subscription payments for revenue audit
router.get('/subscription-payments', async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    const page = parseInt(req.query.page as string, 10) || 1;
    const pageSize = parseInt(req.query.pageSize as string, 10) || 50;
    const data = await adminService.getSubscriptionPayments(userId, page, pageSize);
    res.json(successResponse(data));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

// Change account province (e.g. user moved provinces)
router.patch('/accounts/:id/province', async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    const { province, notes } = req.body;
    if (!['QC', 'ON'].includes(province)) {
      return res.status(400).json(errorResponse('province must be "QC" or "ON"', 'INVALID_PROVINCE'));
    }
    const updated = await adminService.changeProvince(userId, req.params.id, province, notes);
    res.json(successResponse(updated, 'Province updated'));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

// Change requests — list + review
router.get('/change-requests', async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    const status = req.query.status as string | undefined;
    const data = await adminService.listChangeRequests(userId, status);
    res.json(successResponse(data));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.post('/change-requests/:id/review', async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).user!;
    const { decision, reviewNotes } = req.body;
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json(errorResponse('decision must be "approved" or "rejected"', 'INVALID_DECISION'));
    }
    const updated = await adminService.reviewChangeRequest(userId, req.params.id, decision, reviewNotes);
    res.json(successResponse(updated, `Change request ${decision}`));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

export default router;
