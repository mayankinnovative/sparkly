import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { tenantScope } from '../../middleware/tenantScope';
import { validate } from '../../middleware/validate';
import { createInvoiceSchema, updateInvoiceSchema } from './invoices.schema';
import { invoicesService } from './invoices.service';
import { successResponse, errorResponse } from '../../utils/response';
import Stripe from 'stripe';
import { config } from '../../config';

const router = Router();

// ─── Stripe webhook (must be before body parser — raw body needed) ──────────
const stripe = new Stripe(config.stripe.secretKey);

router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  try {
    const event = stripe.webhooks.constructEvent(
      (req as any).rawBody || req.body,
      sig,
      config.stripe.webhookSecret,
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      await invoicesService.handlePaymentSuccess(session.id);
    }

    res.json({ received: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Authenticated routes ───────────────────────────────────────────────────
router.use(authenticate, tenantScope);

router.get('/', async (req, res) => {
  try {
    const { status, customerId } = req.query as any;
    const invoices = await invoicesService.list(req.user!.accountId, { status, customerId });
    res.json(successResponse(invoices));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.get('/:id', async (req, res) => {
  try {
    const invoice = await invoicesService.getById(req.user!.accountId, req.params.id);
    res.json(successResponse(invoice));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.post('/', validate(createInvoiceSchema), async (req, res) => {
  try {
    const invoice = await invoicesService.create(req.user!.accountId, req.body);
    res.status(201).json(successResponse(invoice));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.put('/:id', validate(updateInvoiceSchema), async (req, res) => {
  try {
    const invoice = await invoicesService.update(req.user!.accountId, req.params.id as string, req.body);
    res.json(successResponse(invoice));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

router.post('/:id/payment-link', requireRole('account_owner'), async (req, res) => {
  try {
    const link = await invoicesService.createPaymentLink(req.user!.accountId, req.params.id as string);
    res.status(201).json(successResponse(link));
  } catch (err: any) {
    const status = err.statusCode || 500;
    res.status(status).json(errorResponse(err.message, err.code));
  }
});

export default router;
