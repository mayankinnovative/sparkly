import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { tenantScope } from '../../middleware/tenantScope';
import { dashboardService } from './dashboard.service';
import { successResponse, errorResponse } from '../../utils/response';

const router = Router();

router.use(authenticate, tenantScope);

router.get('/overview', async (req, res) => {
  try {
    const accountId = req.user!.accountId;
    const { from, to } = req.query as any;
    if (!from || !to) {
      return res.status(400).json(errorResponse('from and to are required', 'MISSING_PARAMS'));
    }
    const overview = await dashboardService.getOverview(accountId, from, to);
    res.json(successResponse(overview));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.get('/monthly-revenue', async (req, res) => {
  try {
    const accountId = req.user!.accountId;
    const year = parseInt(req.query.year as string, 10) || new Date().getFullYear();
    const data = await dashboardService.getMonthlyRevenue(accountId, year);
    res.json(successResponse(data));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.get('/top-clients', async (req, res) => {
  try {
    const accountId = req.user!.accountId;
    const { from, to, limit } = req.query as any;
    if (!from || !to) {
      return res.status(400).json(errorResponse('from and to are required', 'MISSING_PARAMS'));
    }
    const data = await dashboardService.getTopClients(accountId, from, to, limit ? parseInt(limit, 10) : 5);
    res.json(successResponse(data));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.get('/tax-summary', async (req, res) => {
  try {
    const accountId = req.user!.accountId;
    const { from, to } = req.query as any;
    if (!from || !to) {
      return res.status(400).json(errorResponse('from and to are required', 'MISSING_PARAMS'));
    }
    const data = await dashboardService.getTaxSummary(accountId, from, to);
    res.json(successResponse(data));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

export default router;
