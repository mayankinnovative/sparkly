import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { requirePlan } from '../../middleware/planGate';
import { tenantScope } from '../../middleware/tenantScope';
import { validate } from '../../middleware/validate';
import { createPayrollEntrySchema, updatePayrollEntrySchema, calculatePayrollSchema } from './payroll.schema';
import { payrollService } from './payroll.service';
import { successResponse, errorResponse } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const router = Router();

router.use(authenticate, tenantScope, requirePlan('pro'));

router.get('/', async (req, res) => {
  try {
    const { accountId } = (req as AuthenticatedRequest).user!;
    const { userId, from, to } = req.query as any;
    const entries = await payrollService.list(accountId, { userId, from, to });
    res.json(successResponse(entries));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.get('/remittance', async (req, res) => {
  try {
    const { accountId } = (req as AuthenticatedRequest).user!;
    const { from, to } = req.query as any;
    if (!from || !to) {
      return res.status(400).json(errorResponse('from and to are required', 'MISSING_PARAMS'));
    }
    const summary = await payrollService.remittanceSummary(accountId, from, to);
    res.json(successResponse(summary));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { accountId } = (req as AuthenticatedRequest).user!;
    const entry = await payrollService.getById(accountId, req.params.id);
    res.json(successResponse(entry));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.post('/', requireRole('account_owner', 'accountant'), validate(createPayrollEntrySchema), async (req, res) => {
  try {
    const { accountId } = (req as AuthenticatedRequest).user!;
    const entry = await payrollService.create(accountId, req.body);
    res.status(201).json(successResponse(entry));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.post('/preview', validate(calculatePayrollSchema), async (req, res) => {
  try {
    const { grossPay, province, annualizedGross } = req.body;
    const preview = await payrollService.preview(grossPay, province, annualizedGross);
    res.json(successResponse(preview));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.put('/:id', requireRole('account_owner', 'accountant'), validate(updatePayrollEntrySchema), async (req, res) => {
  try {
    const { accountId } = (req as AuthenticatedRequest).user!;
    const entry = await payrollService.update(accountId, req.params.id as string, req.body);
    res.json(successResponse(entry));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.delete('/:id', requireRole('account_owner'), async (req, res) => {
  try {
    const { accountId } = (req as AuthenticatedRequest).user!;
    await payrollService.delete(accountId, req.params.id as string);
    res.json(successResponse(null, 'Payroll entry deleted'));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

export default router;
