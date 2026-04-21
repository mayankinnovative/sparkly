import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://postgres:Nvz2yfSQNx33Gvmx@db.weajwtwdihmazrrroyoq.supabase.co:5432/postgres' } },
});

async function main() {
  const accounts = await prisma.account.findMany({
    select: { id: true, name: true, province: true, _count: { select: { invoices: true } } },
  });
  console.log('=== Accounts with Invoice Counts ===');
  console.table(accounts.map(a => ({ name: a.name, province: a.province, invoices: a._count.invoices, id: a.id })));

  // Check a few invoices per account
  for (const a of accounts) {
    const invoices = await prisma.invoice.findMany({
      where: { accountId: a.id },
      select: { id: true, invoiceNo: true, subtotal: true, total: true, status: true, taxType: true },
      take: 3,
    });
    console.log(`\n--- ${a.name} (${a.province}) invoices (first 3) ---`);
    console.table(invoices);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
