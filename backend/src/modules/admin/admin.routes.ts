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

export default router;
