import Stripe from 'stripe';
import prisma from '../../config/database';
import { config } from '../../config';
import { AppError } from '../../utils/response';

const stripe = new Stripe(config.stripe.secretKey);

const DEFAULT_PRICES: Record<string, number> = { solo: 19, pro: 29, business: 49 };

const VALID_PLANS = ['solo', 'pro', 'business'] as const;
type Plan = (typeof VALID_PLANS)[number];

const VALID_PROVINCES = ['QC', 'ON', 'AB', 'BC'] as const;
type Province = (typeof VALID_PROVINCES)[number];

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getBasePrice(plan: Plan): Promise<number> {
  const setting = await prisma.platformSetting.findUnique({ where: { key: 'pricing' } });
  const prices = (setting?.value as Record<string, number>) || DEFAULT_PRICES;
  return prices[plan] ?? DEFAULT_PRICES[plan];
}

// Federal/provincial tax rates applied to SaaS subscriptions, mirrored from the
// invoices module. These numbers can later be moved to a platform setting.
const TAX_RATES: Record<Province, { gst: number; qst: number; hst: number }> = {
  QC: { gst: 0.05, qst: 0.09975, hst: 0 },
  ON: { gst: 0, qst: 0, hst: 0.13 },
  AB: { gst: 0.05, qst: 0, hst: 0 },
  BC: { gst: 0.05, qst: 0, hst: 0 },
};

function getTaxRates(province: Province) {
  return TAX_RATES[province] || TAX_RATES.QC;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// ─── Coupon validation ──────────────────────────────────────────────────────

export async function validateCoupon(input: {
  code: string;
  plan?: string;
  province?: string;
}) {
  const code = input.code.trim().toUpperCase();
  if (!code) throw new AppError(400, 'Coupon code is required', 'CODE_REQUIRED');

  const coupon = await prisma.discountCode.findUnique({ where: { code } });
  if (!coupon || !coupon.isActive) {
    throw new AppError(404, 'Invalid or inactive discount code', 'COUPON_INVALID');
  }
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    throw new AppError(400, 'This discount code has expired', 'COUPON_EXPIRED');
  }
  if (coupon.maxUses !== null && coupon.maxUses !== undefined && coupon.currentUses >= coupon.maxUses) {
    throw new AppError(400, 'This discount code has reached its usage limit', 'COUPON_EXHAUSTED');
  }

  const plan = (input.plan as Plan) || 'pro';
  const province = (input.province as Province) || 'QC';
  if (!VALID_PLANS.includes(plan)) throw new AppError(400, 'Invalid plan', 'PLAN_INVALID');
  if (!VALID_PROVINCES.includes(province)) throw new AppError(400, 'Invalid province', 'PROVINCE_INVALID');

  const subtotal = await getBasePrice(plan);
  const discountValue = coupon.discountValue.toNumber();
  let discount = 0;
  if (coupon.discountType === 'percentage') {
    discount = round2(subtotal * (discountValue / 100));
  } else {
    discount = round2(Math.min(discountValue, subtotal));
  }
  const afterDiscount = round2(subtotal - discount);

  // Apply taxes AFTER discount (per client rule from Apr 12)
  const rates = getTaxRates(province);
  const gst = round2(afterDiscount * rates.gst);
  const qst = round2(afterDiscount * rates.qst);
  const hst = round2(afterDiscount * rates.hst);
  const taxTotal = round2(gst + qst + hst);
  const total = round2(afterDiscount + taxTotal);

  return {
    valid: true,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue,
    breakdown: {
      plan,
      province,
      subtotal,
      discount,
      afterDiscount,
      gst,
      qst,
      hst,
      taxTotal,
      total,
    },
  };
}

// ─── Upgrade flow ───────────────────────────────────────────────────────────

export async function createUpgradeCheckoutSession(input: {
  accountId: string;
  userId: string;
  plan: string;
  discountCode?: string;
}) {
  const plan = input.plan as Plan;
  if (!VALID_PLANS.includes(plan)) {
    throw new AppError(400, 'Invalid plan', 'PLAN_INVALID');
  }

  const account = await prisma.account.findUnique({ where: { id: input.accountId } });
  if (!account) throw new AppError(404, 'Account not found', 'ACCOUNT_NOT_FOUND');
  if (account.plan === plan) {
    throw new AppError(400, 'You are already on this plan', 'SAME_PLAN');
  }

  const province = account.province as Province;
  const subtotal = await getBasePrice(plan);

  let discount = 0;
  let appliedCode: string | null = null;
  if (input.discountCode) {
    const validated = await validateCoupon({ code: input.discountCode, plan, province });
    discount = validated.breakdown.discount;
    appliedCode = validated.code;
  }
  const afterDiscount = round2(subtotal - discount);

  const rates = getTaxRates(province);
  const gst = round2(afterDiscount * rates.gst);
  const qst = round2(afterDiscount * rates.qst);
  const hst = round2(afterDiscount * rates.hst);
  const taxTotal = round2(gst + qst + hst);
  const total = round2(afterDiscount + taxTotal);

  const appUrl = process.env.CORS_ORIGIN || 'http://localhost:5173';

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price_data: {
        currency: 'cad',
        product_data: {
          name: `Sparkly ${plan.toUpperCase()} plan — first month`,
          description: appliedCode
            ? `Coupon ${appliedCode} applied: -$${discount.toFixed(2)}. Taxes (${province}) computed on the discounted price.`
            : `Taxes (${province}) computed on the base price.`,
        },
        unit_amount: Math.round(afterDiscount * 100),
      },
      quantity: 1,
    },
  ];
  if (taxTotal > 0) {
    lineItems.push({
      price_data: {
        currency: 'cad',
        product_data: {
          name: `Sales tax (${province})`,
          description: `GST $${gst.toFixed(2)} • QST $${qst.toFixed(2)} • HST $${hst.toFixed(2)}`,
        },
        unit_amount: Math.round(taxTotal * 100),
      },
      quantity: 1,
    });
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    success_url: `${appUrl}/app/pricing?upgrade=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/app/pricing?upgrade=cancelled`,
    client_reference_id: input.accountId,
    metadata: {
      purpose: 'subscription_upgrade',
      accountId: input.accountId,
      userId: input.userId,
      plan,
      discountCode: appliedCode || '',
      subtotal: subtotal.toFixed(2),
      discount: discount.toFixed(2),
      afterDiscount: afterDiscount.toFixed(2),
      taxTotal: taxTotal.toFixed(2),
      total: total.toFixed(2),
    },
  });

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
    breakdown: { plan, province, subtotal, discount, afterDiscount, gst, qst, hst, taxTotal, total },
  };
}

// ─── Webhook completion (called from invoices webhook router) ───────────────

export async function handleUpgradeCompleted(session: Stripe.Checkout.Session) {
  if (session.metadata?.purpose !== 'subscription_upgrade') return;
  const accountId = session.metadata.accountId;
  const plan = session.metadata.plan as Plan;
  const discountCode = session.metadata.discountCode;
  if (!accountId || !VALID_PLANS.includes(plan)) return;

  await prisma.$transaction(async (tx) => {
    await tx.account.update({ where: { id: accountId }, data: { plan } });
    await tx.subscription.updateMany({
      where: { accountId },
      data: { plan, status: 'active', startDate: new Date(), endDate: null },
    });
    if (discountCode) {
      await tx.discountCode.updateMany({
        where: { code: discountCode },
        data: { currentUses: { increment: 1 } },
      });
    }
    await tx.adminAction.create({
      data: {
        adminUserId: session.metadata!.userId,
        action: 'subscription_upgrade',
        targetEntity: 'account',
        targetId: accountId,
        metadata: {
          plan,
          discountCode: discountCode || null,
          stripeSessionId: session.id,
          total: session.metadata!.total,
        },
      },
    });
  });
}

// ─── Stripe Customer Portal ──────────────────────────────────────────────────

/**
 * Creates a Stripe Billing Portal session so the account owner can
 * manage their subscription (cancel, update payment method, etc.).
 * Requires that the subscription has a stripeCustomerId already set.
 * If not set (manual upgrade path), we create a Stripe customer on the fly.
 */
export async function createPortalSession(input: {
  accountId: string;
  returnUrl: string;
}) {
  const subscription = await prisma.subscription.findUnique({
    where: { accountId: input.accountId },
    include: { account: true },
  });

  let stripeCustomerId = subscription?.stripeCustomerId ?? null;

  if (!stripeCustomerId) {
    // Create a Stripe customer so the portal can be accessed
    const account = subscription?.account ?? await prisma.account.findUnique({ where: { id: input.accountId } });
    if (!account) throw new AppError(404, 'Account not found', 'ACCOUNT_NOT_FOUND');

    const owner = await prisma.user.findFirst({
      where: { accountId: input.accountId, role: 'account_owner' },
    });

    const customer = await stripe.customers.create({
      name: account.name,
      email: owner?.email,
      metadata: { accountId: input.accountId },
    });
    stripeCustomerId = customer.id;

    // Persist the customer ID so future portal requests re-use it
    if (subscription) {
      await prisma.subscription.update({
        where: { accountId: input.accountId },
        data: { stripeCustomerId },
      });
    }
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: input.returnUrl,
  });

  return { portalUrl: session.url };
}

export const subscriptionsService = {
  validateCoupon,
  createUpgradeCheckoutSession,
  handleUpgradeCompleted,
  createPortalSession,
};
