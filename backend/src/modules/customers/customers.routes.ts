import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { tenantScope } from '../../middleware/tenantScope';
import { validate } from '../../middleware/validate';
import { createCustomerSchema, updateCustomerSchema } from './customers.schema';
import { customersService } from './customers.service';
import { successResponse, errorResponse } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const router = Router();

router.use(authenticate, tenantScope);

router.get('/', async (req, res) => {
  try {
    const { accountId } = (req as AuthenticatedRequest).user!;
    const customers = await customersService.list(accountId);
    res.json(successResponse(customers));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { accountId } = (req as AuthenticatedRequest).user!;
    const customer = await customersService.getById(accountId, req.params.id);
    res.json(successResponse(customer));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.post('/', validate(createCustomerSchema), async (req, res) => {
  try {
    const { accountId } = (req as AuthenticatedRequest).user!;
    const customer = await customersService.create(accountId, req.body);
    res.status(201).json(successResponse(customer));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.put('/:id', validate(updateCustomerSchema), async (req, res) => {
  try {
    const { accountId } = (req as AuthenticatedRequest).user!;
    const customer = await customersService.update(accountId, req.params.id as string, req.body);
    res.json(successResponse(customer));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.delete('/:id', requireRole('account_owner'), async (req, res) => {
  try {
    const { accountId } = (req as AuthenticatedRequest).user!;
    await customersService.softDelete(accountId, req.params.id as string);
    res.json(successResponse(null, 'Customer deleted'));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

export default router;
