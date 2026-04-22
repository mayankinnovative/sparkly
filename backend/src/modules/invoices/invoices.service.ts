import prisma from '../../config/database';
import { AppError, tenantFilter, requireAccountId } from '../../utils/response';
import { CreateInvoiceInput, UpdateInvoiceInput } from './invoices.schema';
import Stripe from 'stripe';
import { config } from '../../config';
import { todayInTimezone } from '../../utils/timezone';
import { sendPaymentLinkEmail } from '../../utils/mailer';

const stripe = new Stripe(config.stripe.secretKey);

// Tax rates
const TAX_RATES: Record<string, { gst: number; qst: number; hst: number }> = {
  GST_QST: { gst: 0.05, qst: 0.09975, hst: 0 },
  HST: { gst: 0, qst: 0, hst: 0.13 },
};

function generateInvoiceNumber(): string {
  const prefix = 'INV';
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

export class InvoicesService {
  async list(accountId: string | null, filters?: { status?: string; customerId?: string }) {
    const where: any = { ...tenantFilter(accountId) };
    if (filters?.status) where.status = filters.status;
    if (filters?.customerId) where.customerId = filters.customerId;

    return prisma.invoice.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true, customerType: true } },
        paymentLink: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(accountId: string | null, id: string) {
    const invoice = await prisma.invoice.findFirst({
      where: { id, ...tenantFilter(accountId) },
      include: {
        customer: true,
        paymentLink: true,
      },
    });
    if (!invoice) throw new AppError(404, 'Invoice not found', 'NOT_FOUND');
    return invoice;
  }

  async create(accountId: string | null, input: CreateInvoiceInput, timezone?: string) {
    const aid = requireAccountId(accountId);
    // Verify customer
    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, accountId: aid, isActive: true },
    });
    if (!customer) throw new AppError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND');

    // Fetch jobs and calculate subtotal
    const jobs = await prisma.job.findMany({
      where: { id: { in: input.jobIds }, accountId: aid },
    });
    if (jobs.length !== input.jobIds.length) {
      throw new AppError(400, 'Some jobs not found', 'JOBS_NOT_FOUND');
    }

    const subtotal = jobs.reduce((sum: number, j) => sum + j.price.toNumber(), 0);
    const rates = TAX_RATES[input.taxType];
    const gstAmount = Math.round(subtotal * rates.gst * 100) / 100;
    const qstAmount = Math.round(subtotal * rates.qst * 100) / 100;
    const hstAmount = Math.round(subtotal * rates.hst * 100) / 100;
    const taxAmount = Math.round((gstAmount + qstAmount + hstAmount) * 100) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;

    // Build tax breakdown based on tax type
    const taxBreakdown = input.taxType === 'GST_QST'
      ? { gst: gstAmount, qst: qstAmount }
      : { hst: hstAmount };

    // Build line items from jobs
    const lineItems = jobs.map((j) => ({
      description: j.title || j.description || 'Cleaning service',
      qty: 1,
      rate: j.price.toNumber(),
      amount: j.price.toNumber(),
    }));

    return prisma.invoice.create({
      data: {
        accountId: aid,
        customerId: input.customerId,
        invoiceNo: generateInvoiceNumber(),
        lineItems,
        subtotal,
        taxAmount,
        total,
        taxType: input.taxType,
        taxBreakdown,
        issuedDate: todayInTimezone(timezone || 'UTC'),
        dueDate: new Date(input.dueDate),
        language: input.language ?? 'en',
        notes: input.notes,
        status: 'draft',
      },
    });
  }

  async update(accountId: string | null, id: string, input: UpdateInvoiceInput) {
    const aid = requireAccountId(accountId);
    const invoice = await prisma.invoice.findFirst({ where: { id, accountId: aid } });
    if (!invoice) throw new AppError(404, 'Invoice not found', 'NOT_FOUND');

    const data: any = { ...input };
    if (input.dueDate) data.dueDate = new Date(input.dueDate);

    return prisma.invoice.update({ where: { id }, data });
  }

  async createPaymentLink(accountId: string | null, invoiceId: string, recipientEmail: string) {
    // tenantFilter(null) = {} so super_admin can access any invoice
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, ...tenantFilter(accountId) },
      include: { customer: true },
    });
    if (!invoice) throw new AppError(404, 'Invoice not found', 'NOT_FOUND');

    // Use the invoice's own accountId (works for both account_owner and super_admin)
    const aid = invoice.accountId;
    if (!invoice) throw new AppError(404, 'Invoice not found', 'NOT_FOUND');
    if (invoice.status === 'paid') throw new AppError(400, 'Invoice already paid', 'ALREADY_PAID');
    if (invoice.status === 'cancelled') throw new AppError(400, 'Invoice is cancelled', 'INVOICE_CANCELLED');

    // Re-use existing pending link or create a new Stripe session
    let paymentLink = await prisma.paymentLink.findFirst({
      where: { invoiceId, status: 'pending' },
    });

    if (!paymentLink) {
      const appUrl = process.env.CORS_ORIGIN || 'https://sparkly-kohl.vercel.app';

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'cad',
              product_data: {
                name: `Invoice ${invoice.invoiceNo}`,
                description: `Payment for ${invoice.customer.name}`,
              },
              unit_amount: Math.round(invoice.total.toNumber() * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${appUrl}/app/invoices?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/app/invoices?payment=cancelled`,
        metadata: { invoiceId, invoiceNo: invoice.invoiceNo, accountId: aid },
        customer_email: recipientEmail,
      });

      paymentLink = await prisma.paymentLink.create({
        data: {
          invoiceId,
          stripeSessionId: session.id,
          url: session.url!,
          status: 'pending',
        },
      });

      // Mark invoice as sent
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'sent' },
      });
    }

    // Send email with payment link
    await sendPaymentLinkEmail({
      to: recipientEmail,
      invoiceNo: invoice.invoiceNo,
      customerName: invoice.customer.name,
      total: invoice.total.toNumber(),
      paymentUrl: paymentLink.url!,
      dueDate: new Date(invoice.dueDate).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }),
    });

    // Record sent timestamp
    await prisma.paymentLink.update({
      where: { id: paymentLink.id },
      data: { sentAt: new Date(), method: 'Email' },
    });

    return paymentLink;
  }

  /** Create (or return existing) Stripe checkout session — no email sent */
  async generatePaymentLink(accountId: string | null, invoiceId: string) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, ...tenantFilter(accountId) },
      include: { customer: true },
    });
    if (!invoice) throw new AppError(404, 'Invoice not found', 'NOT_FOUND');
    if (invoice.status === 'paid') throw new AppError(400, 'Invoice already paid', 'ALREADY_PAID');
    if (invoice.status === 'cancelled') throw new AppError(400, 'Invoice is cancelled', 'INVOICE_CANCELLED');

    const aid = invoice.accountId;

    let paymentLink = await prisma.paymentLink.findFirst({
      where: { invoiceId, status: 'pending' },
    });

    if (!paymentLink) {
      const appUrl = process.env.CORS_ORIGIN || 'https://sparkly-kohl.vercel.app';

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'cad',
              product_data: {
                name: `Invoice ${invoice.invoiceNo}`,
                description: `Payment for ${invoice.customer.name}`,
              },
              unit_amount: Math.round(invoice.total.toNumber() * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${appUrl}/app/invoices?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/app/invoices?payment=cancelled`,
        metadata: { invoiceId, invoiceNo: invoice.invoiceNo, accountId: aid },
      });

      paymentLink = await prisma.paymentLink.create({
        data: {
          invoiceId,
          stripeSessionId: session.id,
          url: session.url!,
          status: 'pending',
        },
      });

      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'sent' },
      });
    }

    return paymentLink;
  }

  /** Called by Stripe webhook on checkout.session.completed */
  async handlePaymentSuccess(sessionId: string) {
    // Try by session ID first, fall back to invoiceId from metadata
    let paymentLink = await prisma.paymentLink.findFirst({
      where: { stripeSessionId: sessionId },
    });

    if (!paymentLink) {
      // Fallback: retrieve session from Stripe to get invoiceId from metadata
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const invoiceId = session.metadata?.invoiceId;
      if (!invoiceId) return;
      paymentLink = await prisma.paymentLink.findFirst({ where: { invoiceId } });
      if (!paymentLink) return;
    }

    await prisma.$transaction([
      prisma.paymentLink.update({
        where: { id: paymentLink.id },
        data: { status: 'completed' },
      }),
      prisma.invoice.update({
        where: { id: paymentLink.invoiceId },
        data: { status: 'paid' },
      }),
    ]);
  }
}

export const invoicesService = new InvoicesService();
