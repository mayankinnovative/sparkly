import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { tenantScope } from '../../middleware/tenantScope';
import { validate } from '../../middleware/validate';
import { createCustomerSchema, updateCustomerSchema } from './customers.schema';
import { customersService } from './customers.service';
import { successResponse, errorResponse } from '../../utils/response';

const router = Router();

router.use(authenticate, tenantScope);

router.get('/', async (req, res) => {
  try {
    const customers = await customersService.list(req.user!.accountId);
    res.json(successResponse(customers));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.get('/:id', async (req, res) => {
  try {
    const customer = await customersService.getById(req.user!.accountId, req.params.id);
    res.json(successResponse(customer));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.post('/', validate(createCustomerSchema), async (req, res) => {
  try {
    const customer = await customersService.create(req.user!.accountId, req.body);
    res.status(201).json(successResponse(customer));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.put('/:id', validate(updateCustomerSchema), async (req, res) => {
  try {
    const customer = await customersService.update(req.user!.accountId, req.params.id as string, req.body);
    res.json(successResponse(customer));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.delete('/:id', requireRole('account_owner'), async (req, res) => {
  try {
    await customersService.softDelete(req.user!.accountId, req.params.id as string);
    res.json(successResponse(null, 'Customer deleted'));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

export default router;
