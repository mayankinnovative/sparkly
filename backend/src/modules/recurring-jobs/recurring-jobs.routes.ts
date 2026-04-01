import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { requirePlan } from '../../middleware/planGate';
import { tenantScope } from '../../middleware/tenantScope';
import { validate } from '../../middleware/validate';
import { createRecurringJobSchema, updateRecurringJobSchema } from './recurring-jobs.schema';
import { recurringJobsService } from './recurring-jobs.service';
import { successResponse, errorResponse } from '../../utils/response';

const router = Router();

// Recurring jobs require at least pro plan
router.use(authenticate, tenantScope, requirePlan('pro'));

router.get('/', async (req, res) => {
  try {
    const jobs = await recurringJobsService.list(req.user!.accountId);
    res.json(successResponse(jobs));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.get('/:id', async (req, res) => {
  try {
    const job = await recurringJobsService.getById(req.user!.accountId, req.params.id);
    res.json(successResponse(job));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.post('/', validate(createRecurringJobSchema), async (req, res) => {
  try {
    const job = await recurringJobsService.create(req.user!.accountId, req.body);
    res.status(201).json(successResponse(job));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.put('/:id', validate(updateRecurringJobSchema), async (req, res) => {
  try {
    const job = await recurringJobsService.update(req.user!.accountId, req.params.id as string, req.body);
    res.json(successResponse(job));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.patch('/:id/cancel', requireRole('account_owner'), async (req, res) => {
  try {
    const job = await recurringJobsService.cancel(req.user!.accountId, req.params.id as string);
    res.json(successResponse(job, 'Recurring job cancelled'));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await recurringJobsService.delete(req.user!.accountId, req.params.id);
    res.json(successResponse(null, 'Recurring job deleted'));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

export default router;
