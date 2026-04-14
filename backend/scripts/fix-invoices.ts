/**
 * One-time script to:
 * 1. Update existing QC invoices with taxType and taxBreakdown
 * 2. Insert ON invoices with HST tax data
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing invoice tax data...\n');

  // ─── 1. Update existing QC invoices with taxBreakdown ───
  const qcInvoices = await prisma.invoice.findMany({
    where: { taxBreakdown: { equals: Prisma.DbNull } },
  });

  for (const inv of qcInvoices) {
    const subtotal = inv.subtotal.toNumber();
    const gst = Math.round(subtotal * 0.05 * 100) / 100;
    const qst = Math.round(subtotal * 0.09975 * 100) / 100;
    await prisma.invoice.update({
      where: { id: inv.id },
      data: {
        taxType: 'GST_QST',
        taxBreakdown: { gst, qst },
      },
    });
    console.log(`  ✅ Updated ${inv.invoiceNo}: GST=$${gst}, QST=$${qst}`);
  }

  // ─── 2. Get ON account and customers ────────────────────
  const onAccount = await prisma.account.findFirst({
    where: { id: '00000000-0000-0000-0000-000000000002' },
  });

  if (!onAccount) {
    console.log('❌ ON account not found, skipping ON invoices');
    return;
  }

  const onCustomers = await prisma.customer.findMany({
    where: { accountId: onAccount.id },
    orderBy: { name: 'asc' },
  });

  if (onCustomers.length < 3) {
    console.log('❌ Not enough ON customers, skipping ON invoices');
    return;
  }

  // Check if ON invoices already exist
  const existingON = await prisma.invoice.findFirst({
    where: { accountId: onAccount.id },
  });

  if (existingON) {
    console.log('ℹ️  ON invoices already exist, skipping insert');
  } else {
    // ─── 3. Insert ON invoices with HST ─────────────────────
    const onInvoices = [
      {
        accountId: onAccount.id,
        customerId: onCustomers[0].id,
        lineItems: [{ description: `Office tower cleaning — ${onCustomers[0].name}`, qty: 1, rate: 1200, amount: 1200 }],
        subtotal: 1200,
        taxAmount: Math.round(1200 * 0.13 * 100) / 100,
        total: Math.round(1200 * 1.13 * 100) / 100,
        taxType: 'HST',
        taxBreakdown: { hst: Math.round(1200 * 0.13 * 100) / 100 },
        status: 'paid' as const,
        invoiceNo: 'CT-2026-0313-004',
        issuedDate: new Date('2026-03-13'),
        dueDate: new Date('2026-03-28'),
        language: 'en',
      },
      {
        accountId: onAccount.id,
        customerId: onCustomers[1].id,
        lineItems: [{ description: `Condo common area cleaning — ${onCustomers[1].name}`, qty: 1, rate: 950, amount: 950 }],
        subtotal: 950,
        taxAmount: Math.round(950 * 0.13 * 100) / 100,
        total: Math.round(950 * 1.13 * 100) / 100,
        taxType: 'HST',
        taxBreakdown: { hst: Math.round(950 * 0.13 * 100) / 100 },
        status: 'sent' as const,
        invoiceNo: 'CT-2026-0314-005',
        issuedDate: new Date('2026-03-14'),
        dueDate: new Date('2026-03-29'),
        language: 'en',
      },
      {
        accountId: onAccount.id,
        customerId: onCustomers[2].id,
        lineItems: [{ description: `Medical facility sanitization — ${onCustomers[2].name}`, qty: 1, rate: 780, amount: 780 }],
        subtotal: 780,
        taxAmount: Math.round(780 * 0.13 * 100) / 100,
        total: Math.round(780 * 1.13 * 100) / 100,
        taxType: 'HST',
        taxBreakdown: { hst: Math.round(780 * 0.13 * 100) / 100 },
        status: 'draft' as const,
        invoiceNo: 'CT-2026-0315-006',
        issuedDate: new Date('2026-03-15'),
        dueDate: new Date('2026-03-30'),
        language: 'en',
      },
    ];

    for (const inv of onInvoices) {
      const created = await prisma.invoice.create({ data: inv });
      console.log(`  ✅ Created ON invoice ${inv.invoiceNo}: $${inv.subtotal} + HST $${inv.taxBreakdown.hst}`);

      // Add payment link for paid/sent invoices
      if (inv.status !== 'draft') {
        await prisma.paymentLink.create({
          data: {
            invoiceId: created.id,
            method: 'Email',
            status: inv.status === 'paid' ? 'completed' : 'pending',
            sentAt: inv.issuedDate,
            url: `https://checkout.stripe.com/demo/${created.id}`,
          },
        });
      }
    }
  }

  console.log('\n🎉 Invoice fix completed!');
}

main()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
