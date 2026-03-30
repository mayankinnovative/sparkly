import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ─── 1. Super Admin (no account) ─────────────────────
  const superAdminPassword = await bcrypt.hash(
    process.env.SUPER_ADMIN_PASSWORD || 'Admin@123456',
    10
  );

  const superAdmin = await prisma.user.upsert({
    where: { email: process.env.SUPER_ADMIN_EMAIL || 'admin@sparkly.ca' },
    update: {},
    create: {
      email: process.env.SUPER_ADMIN_EMAIL || 'admin@sparkly.ca',
      username: 'admin_sparkly',
      passwordHash: superAdminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'super_admin',
      accountId: null,
    },
  });
  console.log('✅ Super Admin created:', superAdmin.email);

  // ─── 2. Tax Configs (QC & ON for 2026) ───────────────
  const taxConfigs = [
    {
      province: 'QC' as const,
      taxYear: 2026,
      rates: {
        gst: 0.05,
        pst: 0.09975,
        taxName: { en: 'GST + QST', fr: 'TPS + TVQ' },
        label: { en: 'Québec · GST + QST · CNESST', fr: 'Québec · TPS + TVQ · CNESST' },
        wc: 'CNESST',
        payroll: {
          qpp_rate: 0.064,
          qpp_max_annual: 4038.40,
          qpip_rate: 0.00494,
          qpip_max_annual: 462.79,
          qpip_employer_rate: 0.00692,
          ei_rate: 0.0132,
          ei_max_annual: 1049.12,
          ei_employer_multiplier: 1.4,
          hsf_rate: 0.04260,
          labour_standards_rate: 0.0006,
          cnesst_rate: 0.0154,
          federal_basic_personal: 16129,
          provincial_basic_personal: 18056,
          federal_brackets: [
            { min: 0, max: 57375, rate: 0.15 },
            { min: 57375, max: 114750, rate: 0.205 },
            { min: 114750, max: 158468, rate: 0.26 },
            { min: 158468, max: 223210, rate: 0.29 },
            { min: 223210, max: Infinity, rate: 0.33 },
          ],
          provincial_brackets: [
            { min: 0, max: 51780, rate: 0.14 },
            { min: 51780, max: 103545, rate: 0.19 },
            { min: 103545, max: 126000, rate: 0.24 },
            { min: 126000, max: Infinity, rate: 0.2575 },
          ],
        },
      },
    },
    {
      province: 'ON' as const,
      taxYear: 2026,
      rates: {
        gst: 0.13,
        pst: 0,
        taxName: { en: 'HST', fr: 'TVH' },
        label: { en: 'Ontario · HST · WSIB', fr: 'Ontario · TVH · WSIB' },
        wc: 'WSIB',
        payroll: {
          cpp_rate: 0.0595,
          cpp_max_annual: 3867.50,
          cpp2_rate: 0.04,
          cpp2_additional_max: 396.00,
          ei_rate: 0.0166,
          ei_max_annual: 1049.12,
          ei_employer_multiplier: 1.4,
          eht_threshold: 1000000,
          eht_rate: 0.0195,
          wsib_rate: 0.022,
          federal_basic_personal: 16129,
          provincial_basic_personal: 11865,
          federal_brackets: [
            { min: 0, max: 57375, rate: 0.15 },
            { min: 57375, max: 114750, rate: 0.205 },
            { min: 114750, max: 158468, rate: 0.26 },
            { min: 158468, max: 223210, rate: 0.29 },
            { min: 223210, max: Infinity, rate: 0.33 },
          ],
          provincial_brackets: [
            { min: 0, max: 51446, rate: 0.0505 },
            { min: 51446, max: 102894, rate: 0.0915 },
            { min: 102894, max: 150000, rate: 0.1116 },
            { min: 150000, max: 220000, rate: 0.1216 },
            { min: 220000, max: Infinity, rate: 0.1316 },
          ],
        },
      },
    },
  ];

  for (const config of taxConfigs) {
    await prisma.taxConfig.upsert({
      where: {
        province_taxYear: {
          province: config.province,
          taxYear: config.taxYear,
        },
      },
      update: { rates: config.rates },
      create: config,
    });
  }
  console.log('✅ Tax configs created for QC & ON (2026)');

  // ─── 3. Demo Account (QC) ────────────────────────────
  const ownerPassword = await bcrypt.hash('Demo@123456', 10);

  const demoAccountQC = await prisma.account.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Sparkly Clean Montréal',
      province: 'QC',
      plan: 'pro',
    },
  });

  const ownerQC = await prisma.user.upsert({
    where: { email: 'owner@sparklyclean.ca' },
    update: {},
    create: {
      email: 'owner@sparklyclean.ca',
      username: 'marie_tremblay',
      passwordHash: ownerPassword,
      firstName: 'Marie',
      lastName: 'Tremblay',
      role: 'account_owner',
      accountId: demoAccountQC.id,
    },
  });

  await prisma.subscription.upsert({
    where: { accountId: demoAccountQC.id },
    update: {},
    create: {
      accountId: demoAccountQC.id,
      plan: 'pro',
      status: 'trialing',
      startDate: new Date(),
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // Staff users for QC
  const staffQC1 = await prisma.user.upsert({
    where: { email: 'sophie@sparklyclean.ca' },
    update: {},
    create: {
      email: 'sophie@sparklyclean.ca',
      username: 'sophie_tremblay',
      passwordHash: await bcrypt.hash('Staff@123456', 10),
      firstName: 'Sophie',
      lastName: 'Tremblay',
      role: 'staff',
      accountId: demoAccountQC.id,
    },
  });

  const staffQC2 = await prisma.user.upsert({
    where: { email: 'marc@sparklyclean.ca' },
    update: {},
    create: {
      email: 'marc@sparklyclean.ca',
      username: 'marc_gagnon',
      passwordHash: await bcrypt.hash('Staff@123456', 10),
      firstName: 'Marc',
      lastName: 'Gagnon',
      role: 'staff',
      accountId: demoAccountQC.id,
    },
  });

  // ─── 4. Demo Account (ON) ────────────────────────────
  const demoAccountON = await prisma.account.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'CleanTrack Toronto',
      province: 'ON',
      plan: 'business',
    },
  });

  const ownerON = await prisma.user.upsert({
    where: { email: 'owner@cleantracktoronto.ca' },
    update: {},
    create: {
      email: 'owner@cleantracktoronto.ca',
      username: 'james_wilson',
      passwordHash: ownerPassword,
      firstName: 'James',
      lastName: 'Wilson',
      role: 'account_owner',
      accountId: demoAccountON.id,
    },
  });

  await prisma.subscription.upsert({
    where: { accountId: demoAccountON.id },
    update: {},
    create: {
      accountId: demoAccountON.id,
      plan: 'business',
      status: 'trialing',
      startDate: new Date(),
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const staffON1 = await prisma.user.upsert({
    where: { email: 'emily@cleantracktoronto.ca' },
    update: {},
    create: {
      email: 'emily@cleantracktoronto.ca',
      username: 'emily_carter',
      passwordHash: await bcrypt.hash('Staff@123456', 10),
      firstName: 'Emily',
      lastName: 'Carter',
      role: 'staff',
      accountId: demoAccountON.id,
    },
  });

  const staffON2 = await prisma.user.upsert({
    where: { email: 'noah@cleantracktoronto.ca' },
    update: {},
    create: {
      email: 'noah@cleantracktoronto.ca',
      username: 'noah_wilson',
      passwordHash: await bcrypt.hash('Staff@123456', 10),
      firstName: 'Noah',
      lastName: 'Wilson',
      role: 'staff',
      accountId: demoAccountON.id,
    },
  });

  // ─── 5. Customers ─────────────────────────────────────
  const customersQC = [
    { name: 'Maple Dental', email: 'contact@mapledental.ca', phone: '514-555-0101', address: '1234 Sherbrooke St W', city: 'Montréal', province: 'QC', postalCode: 'H3A 1H6' },
    { name: 'Lévesque Residence', email: 'levesque@gmail.com', phone: '514-555-0202', address: '456 Laurier Ave', city: 'Montréal', province: 'QC', postalCode: 'H2V 2K7' },
    { name: 'Northview Offices', email: 'admin@northview.ca', phone: '514-555-0303', address: '789 René-Lévesque Blvd', city: 'Montréal', province: 'QC', postalCode: 'H3B 4W8' },
    { name: 'Parkside Move-Out', email: 'parkside@mail.com', phone: '514-555-0404', address: '321 Saint-Denis St', city: 'Montréal', province: 'QC', postalCode: 'H2X 3L3' },
  ];

  const customersON = [
    { name: 'Bay Street Tower', email: 'facilities@bayst.ca', phone: '416-555-0101', address: '100 King Street W', city: 'Toronto', province: 'ON', postalCode: 'M5X 1A9' },
    { name: 'Yorkville Condos', email: 'mgmt@yorkvillecondos.ca', phone: '416-555-0202', address: '200 Bloor St W', city: 'Toronto', province: 'ON', postalCode: 'M5S 1T8' },
    { name: 'Scarborough Medical', email: 'ops@scarmed.ca', phone: '416-555-0303', address: '300 Lawrence Ave E', city: 'Scarborough', province: 'ON', postalCode: 'M1P 2P9' },
  ];

  const createdCustomersQC = [];
  for (const c of customersQC) {
    const customer = await prisma.customer.upsert({
      where: { accountId_email: { accountId: demoAccountQC.id, email: c.email } },
      update: {},
      create: { ...c, accountId: demoAccountQC.id },
    });
    createdCustomersQC.push(customer);
  }

  const createdCustomersON = [];
  for (const c of customersON) {
    const customer = await prisma.customer.upsert({
      where: { accountId_email: { accountId: demoAccountON.id, email: c.email } },
      update: {},
      create: { ...c, accountId: demoAccountON.id },
    });
    createdCustomersON.push(customer);
  }
  console.log('✅ Customers created');

  // ─── 6. Jobs (QC Account) ─────────────────────────────
  const jobsQC = [
    {
      accountId: demoAccountQC.id,
      customerId: createdCustomersQC[0].id,
      title: 'Maple Dental Evening Cleaning',
      jobType: 'Commercial',
      price: 840,
      duration: 5,
      supplies: 42,
      staffCount: 2,
      notes: 'Evening office cleaning',
      status: 'completed' as const,
      scheduledDate: new Date('2026-03-03'),
      assignedTo: staffQC1.id,
    },
    {
      accountId: demoAccountQC.id,
      customerId: createdCustomersQC[1].id,
      title: 'Lévesque Deep Clean',
      jobType: 'Deep Clean',
      price: 420,
      duration: 4,
      supplies: 30,
      staffCount: 1,
      notes: 'Kitchen and bathrooms',
      status: 'completed' as const,
      scheduledDate: new Date('2026-03-05'),
      assignedTo: staffQC2.id,
    },
    {
      accountId: demoAccountQC.id,
      customerId: createdCustomersQC[2].id,
      title: 'Northview Weekly Service',
      jobType: 'Recurring',
      price: 690,
      duration: 4,
      supplies: 28,
      staffCount: 2,
      notes: 'Weekly service',
      status: 'completed' as const,
      scheduledDate: new Date('2026-03-06'),
      assignedTo: staffQC1.id,
    },
    {
      accountId: demoAccountQC.id,
      customerId: createdCustomersQC[3].id,
      title: 'Parkside Move-Out Clean',
      jobType: 'Move-Out',
      price: 510,
      duration: 6,
      supplies: 35,
      staffCount: 2,
      notes: 'Full turnover clean',
      status: 'pending' as const,
      scheduledDate: new Date('2026-03-09'),
    },
  ];

  for (const job of jobsQC) {
    await prisma.job.create({ data: job });
  }
  console.log('✅ Jobs created (QC)');

  // ─── 7. Expenses (QC Account) ─────────────────────────
  const expensesQC = [
    { accountId: demoAccountQC.id, category: 'supplies' as const, amount: 185, description: 'Bulk chemicals', date: new Date('2026-03-02') },
    { accountId: demoAccountQC.id, category: 'fuel' as const, amount: 96, description: 'Weekly routes', date: new Date('2026-03-04') },
    { accountId: demoAccountQC.id, category: 'software' as const, amount: 49, description: 'Scheduling software', date: new Date('2026-03-07') },
    { accountId: demoAccountQC.id, category: 'wages' as const, amount: 420, description: 'Part-time helper', date: new Date('2026-03-08') },
  ];

  for (const exp of expensesQC) {
    await prisma.expense.create({ data: exp });
  }
  console.log('✅ Expenses created (QC)');

  // ─── 8. Recurring Jobs (QC Account) ───────────────────
  const recurringJobsQC = [
    {
      accountId: demoAccountQC.id,
      customerId: createdCustomersQC[2].id,
      title: 'Northview Weekly Cleaning',
      jobType: 'Recurring',
      frequency: 'weekly' as const,
      nextRun: new Date('2026-03-18'),
      status: 'active' as const,
      price: 690,
      duration: 4,
      supplies: 28,
      staffCount: 2,
      delivery: 'Email + SMS',
    },
    {
      accountId: demoAccountQC.id,
      customerId: createdCustomersQC[0].id,
      title: 'Maple Dental Bi-weekly Service',
      jobType: 'Commercial',
      frequency: 'weekly' as const,
      nextRun: new Date('2026-03-20'),
      status: 'active' as const,
      price: 840,
      duration: 5,
      supplies: 42,
      staffCount: 2,
      delivery: 'Email',
    },
    {
      accountId: demoAccountQC.id,
      customerId: createdCustomersQC[1].id,
      title: 'Lévesque Monthly Cleaning',
      jobType: 'Residential',
      frequency: 'monthly' as const,
      nextRun: new Date('2026-04-01'),
      status: 'draft' as const,
      price: 280,
      duration: 3,
      supplies: 15,
      staffCount: 1,
      delivery: 'SMS',
    },
  ];

  for (const rj of recurringJobsQC) {
    await prisma.recurringJob.create({ data: rj });
  }
  console.log('✅ Recurring jobs created (QC)');

  // ─── 9. Invoices & Payment Links (QC) ─────────────────
  const invoiceData = [
    {
      accountId: demoAccountQC.id,
      customerId: createdCustomersQC[2].id,
      lineItems: [{ description: 'Commercial cleaning — Northview Offices', qty: 1, rate: 690, amount: 690 }],
      subtotal: 690,
      taxAmount: 690 * (0.05 + 0.09975),
      total: 690 * (1 + 0.05 + 0.09975),
      status: 'paid' as const,
      invoiceNo: 'CT-2026-0310-001',
      issuedDate: new Date('2026-03-10'),
      dueDate: new Date('2026-03-25'),
      language: 'en',
    },
    {
      accountId: demoAccountQC.id,
      customerId: createdCustomersQC[0].id,
      lineItems: [{ description: 'Evening office cleaning — Maple Dental', qty: 1, rate: 840, amount: 840 }],
      subtotal: 840,
      taxAmount: 840 * (0.05 + 0.09975),
      total: 840 * (1 + 0.05 + 0.09975),
      status: 'sent' as const,
      invoiceNo: 'CT-2026-0311-002',
      issuedDate: new Date('2026-03-11'),
      dueDate: new Date('2026-03-26'),
      language: 'en',
    },
    {
      accountId: demoAccountQC.id,
      customerId: createdCustomersQC[3].id,
      lineItems: [{ description: 'Move-out cleaning — Parkside', qty: 1, rate: 510, amount: 510 }],
      subtotal: 510,
      taxAmount: 510 * (0.05 + 0.09975),
      total: 510 * (1 + 0.05 + 0.09975),
      status: 'sent' as const,
      invoiceNo: 'CT-2026-0312-003',
      issuedDate: new Date('2026-03-12'),
      dueDate: new Date('2026-03-27'),
      language: 'en',
    },
  ];

  const paymentLinksData = [
    { method: 'Email', status: 'completed' as const, sentAt: new Date('2026-03-10') },
    { method: 'SMS', status: 'pending' as const, sentAt: new Date('2026-03-11') },
    { method: 'Email', status: 'pending' as const, sentAt: new Date('2026-03-12') },
  ];

  for (let i = 0; i < invoiceData.length; i++) {
    const invoice = await prisma.invoice.create({ data: invoiceData[i] });
    await prisma.paymentLink.create({
      data: {
        invoiceId: invoice.id,
        ...paymentLinksData[i],
        url: `https://checkout.stripe.com/demo/${invoice.id}`,
      },
    });
  }
  console.log('✅ Invoices and payment links created');

  // ─── 10. Payroll Entries (QC) ─────────────────────────
  const payrollQC = [
    {
      accountId: demoAccountQC.id,
      userId: staffQC1.id,
      hours: 34,
      hourlyRate: 23,
      flatPay: 0,
      bonus: 40,
      taxableBenefits: 0,
      vacationRate: 0.04,
      holidayPay: 58,
      grossPay: 34 * 23 + 40 + (34 * 23 + 40) * 0.04 + 58,
      deductionBreakdown: { qpp: 86.42, qpip: 15.98, incomeTax: 121.50, employerHsf: 24.14, labourStandards: 0.06 },
      totalDeductions: 86.42 + 15.98 + 121.50,
      netPay: (34 * 23 + 40 + (34 * 23 + 40) * 0.04 + 58) - (86.42 + 15.98 + 121.50),
      province: 'QC' as const,
      workersCompAmount: 34 * 0.0154 * 23,
      employerCosts: 24.14 + (34 * 23 + 40 + (34 * 23 + 40) * 0.04 + 58) * 0.0085,
      payType: 'hourly',
      payPeriodStart: new Date('2026-03-01'),
      payPeriodEnd: new Date('2026-03-15'),
    },
    {
      accountId: demoAccountQC.id,
      userId: staffQC2.id,
      hours: 26,
      hourlyRate: 0,
      flatPay: 690,
      bonus: 0,
      taxableBenefits: 25,
      vacationRate: 0.04,
      holidayPay: 42,
      grossPay: 690 + 25 + (690 + 25) * 0.04 + 42,
      deductionBreakdown: { qpp: 52.64, qpip: 10.21, incomeTax: 76.30, employerHsf: 15.63, labourStandards: 0.06 },
      totalDeductions: 52.64 + 10.21 + 76.30,
      netPay: (690 + 25 + (690 + 25) * 0.04 + 42) - (52.64 + 10.21 + 76.30),
      province: 'QC' as const,
      workersCompAmount: 26 * 0.0154 * 26.54,
      employerCosts: 15.63 + (690 + 25 + (690 + 25) * 0.04 + 42) * 0.0085,
      payType: 'flat_job',
      payPeriodStart: new Date('2026-03-01'),
      payPeriodEnd: new Date('2026-03-15'),
    },
  ];

  for (const entry of payrollQC) {
    await prisma.payrollEntry.create({ data: entry });
  }
  console.log('✅ Payroll entries created (QC)');

  // ─── 11. Payroll Entries (ON) ─────────────────────────
  const payrollON = [
    {
      accountId: demoAccountON.id,
      userId: staffON1.id,
      hours: 38,
      hourlyRate: 22,
      flatPay: 0,
      bonus: 35,
      taxableBenefits: 0,
      vacationRate: 0.04,
      holidayPay: 61,
      grossPay: 38 * 22 + 35 + (38 * 22 + 35) * 0.04 + 61,
      deductionBreakdown: { cpp: 52.18, ei: 13.76, incomeTax: 118.90, eht: 0, wsibInsurable: 932 },
      totalDeductions: 52.18 + 13.76 + 118.90,
      netPay: (38 * 22 + 35 + (38 * 22 + 35) * 0.04 + 61) - (52.18 + 13.76 + 118.90),
      province: 'ON' as const,
      workersCompAmount: 932 * 0.022,
      employerCosts: 0 + 932 * 0.014 + 932 * 0.022,
      payType: 'hourly',
      payPeriodStart: new Date('2026-03-01'),
      payPeriodEnd: new Date('2026-03-15'),
    },
    {
      accountId: demoAccountON.id,
      userId: staffON2.id,
      hours: 21,
      hourlyRate: 0,
      flatPay: 540,
      bonus: 20,
      taxableBenefits: 18,
      vacationRate: 0.04,
      holidayPay: 35,
      grossPay: 540 + 20 + 18 + (540 + 20 + 18) * 0.04 + 35,
      deductionBreakdown: { cpp: 34.44, ei: 9.32, incomeTax: 61.80, eht: 0, wsibInsurable: 613 },
      totalDeductions: 34.44 + 9.32 + 61.80,
      netPay: (540 + 20 + 18 + (540 + 20 + 18) * 0.04 + 35) - (34.44 + 9.32 + 61.80),
      province: 'ON' as const,
      workersCompAmount: 613 * 0.022,
      employerCosts: 0 + 613 * 0.014 + 613 * 0.022,
      payType: 'flat_job',
      payPeriodStart: new Date('2026-03-01'),
      payPeriodEnd: new Date('2026-03-15'),
    },
  ];

  for (const entry of payrollON) {
    await prisma.payrollEntry.create({ data: entry });
  }
  console.log('✅ Payroll entries created (ON)');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Demo Credentials:');
  console.log('  Super Admin:  admin@sparkly.ca / Admin@123456');
  console.log('  QC Owner:     owner@sparklyclean.ca / Demo@123456');
  console.log('  ON Owner:     owner@cleantracktoronto.ca / Demo@123456');
  console.log('  QC Staff:     sophie@sparklyclean.ca / Staff@123456');
  console.log('  ON Staff:     emily@cleantracktoronto.ca / Staff@123456');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
