import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { tenantScope } from '../../middleware/tenantScope';
import { validate } from '../../middleware/validate';
import { createJobSchema, updateJobSchema } from './jobs.schema';
import { jobsService } from './jobs.service';
import { successResponse, errorResponse } from '../../utils/response';

const router = Router();

router.use(authenticate, tenantScope);

router.get('/', async (req, res) => {
  try {
    const { status, customerId, assignedToId, from, to } = req.query as any;
    const jobs = await jobsService.list(req.user!.accountId, { status, customerId, assignedToId, from, to });
    res.json(successResponse(jobs));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.get('/:id', async (req, res) => {
  try {
    const job = await jobsService.getById(req.user!.accountId, req.params.id);
    res.json(successResponse(job));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.post('/', validate(createJobSchema), async (req, res) => {
  try {
    const job = await jobsService.create(req.user!.accountId, req.body);
    res.status(201).json(successResponse(job));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.put('/:id', validate(updateJobSchema), async (req, res) => {
  try {
    const job = await jobsService.update(req.user!.accountId, req.params.id as string, req.body);
    res.json(successResponse(job));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.patch('/:id/complete', async (req, res) => {
  try {
    const job = await jobsService.markCompleted(req.user!.accountId, req.params.id, req.timezone);
    res.json(successResponse(job));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await jobsService.delete(req.user!.accountId, req.params.id);
    res.json(successResponse(null, 'Job deleted'));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

export default router;
