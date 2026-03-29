import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { tenantScope } from '../../middleware/tenantScope';
import { validate } from '../../middleware/validate';
import { createExpenseSchema, updateExpenseSchema } from './expenses.schema';
import { expensesService } from './expenses.service';
import { successResponse, errorResponse } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const router = Router();

router.use(authenticate, tenantScope);

router.get('/', async (req, res) => {
  try {
    const { accountId } = (req as AuthenticatedRequest).user!;
    const { category, from, to } = req.query as any;
    const expenses = await expensesService.list(accountId, { category, from, to });
    res.json(successResponse(expenses));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.get('/summary', async (req, res) => {
  try {
    const { accountId } = (req as AuthenticatedRequest).user!;
    const { from, to } = req.query as any;
    if (!from || !to) {
      return res.status(400).json(errorResponse('from and to are required', 'MISSING_PARAMS'));
    }
    const summary = await expensesService.summary(accountId, from, to);
    res.json(successResponse(summary));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { accountId } = (req as AuthenticatedRequest).user!;
    const expense = await expensesService.getById(accountId, req.params.id);
    res.json(successResponse(expense));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.post('/', validate(createExpenseSchema), async (req, res) => {
  try {
    const { accountId } = (req as AuthenticatedRequest).user!;
    const expense = await expensesService.create(accountId, req.body);
    res.status(201).json(successResponse(expense));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.put('/:id', validate(updateExpenseSchema), async (req, res) => {
  try {
    const { accountId } = (req as AuthenticatedRequest).user!;
    const expense = await expensesService.update(accountId, req.params.id as string, req.body);
    res.json(successResponse(expense));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { accountId } = (req as AuthenticatedRequest).user!;
    await expensesService.delete(accountId, req.params.id);
    res.json(successResponse(null, 'Expense deleted'));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

export default router;
