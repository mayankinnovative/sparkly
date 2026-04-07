import prisma from '../../config/database';
import { tenantFilter } from '../../utils/response';

export class DashboardService {
  async getOverview(accountId: string | null, from: string, to: string) {
    const startDate = new Date(from);
    const endDate = new Date(to);
    const tenant = tenantFilter(accountId);

    const [jobs, expenses, invoices, payroll] = await Promise.all([
      prisma.job.findMany({
        where: { ...tenant, scheduledDate: { gte: startDate, lte: endDate } },
      }),
      prisma.expense.findMany({
        where: { ...tenant, date: { gte: startDate, lte: endDate } },
      }),
      prisma.invoice.findMany({
        where: { ...tenant, createdAt: { gte: startDate, lte: endDate } },
      }),
      prisma.payrollEntry.findMany({
        where: {
          ...tenant,
          payPeriodStart: { gte: startDate },
          payPeriodEnd: { lte: endDate },
        },
      }),
    ]);

    const totalRevenue = jobs
      .filter((j) => j.status === 'completed')
      .reduce((sum: number, j) => sum + j.price.toNumber(), 0);

    const totalExpenses = expenses.reduce((sum: number, e) => sum + e.amount.toNumber(), 0);
    const totalLaborCost = payroll.reduce((sum: number, p) => sum + p.grossPay.toNumber(), 0);
    const profit = totalRevenue - totalExpenses - totalLaborCost;

    const totalInvoiced = invoices.reduce((sum: number, i) => sum + i.total.toNumber(), 0);
    const totalPaid = invoices
      .filter((i) => i.status === 'paid')
      .reduce((sum: number, i) => sum + i.total.toNumber(), 0);
    const totalOutstanding = totalInvoiced - totalPaid;

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalLaborCost: Math.round(totalLaborCost * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      totalInvoiced: Math.round(totalInvoiced * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      jobCount: jobs.length,
      completedJobs: jobs.filter((j) => j.status === 'completed').length,
      invoiceCount: invoices.length,
      expenseCount: expenses.length,
    };
  }

  async getMonthlyRevenue(accountId: string | null, year: number) {
    const jobs = await prisma.job.findMany({
      where: {
        ...tenantFilter(accountId),
        status: 'completed',
        completedAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });

    const monthly: number[] = new Array(12).fill(0);
    for (const job of jobs) {
      if (job.completedAt) {
        const month = job.completedAt.getMonth();
        monthly[month] += job.price.toNumber();
      }
    }

    return monthly.map((v, i) => ({
      month: i + 1,
      revenue: Math.round(v * 100) / 100,
    }));
  }

  async getTopClients(accountId: string | null, from: string, to: string, limit = 5) {
    const jobs = await prisma.job.findMany({
      where: {
        ...tenantFilter(accountId),
        status: 'completed',
        completedAt: { gte: new Date(from), lte: new Date(to) },
      },
      include: { customer: { select: { id: true, name: true } } },
    });

    const clientRevenue: Record<string, { name: string; total: number }> = {};
    for (const job of jobs) {
      const cid = job.customerId;
      if (!cid || !job.customer) continue;
      if (!clientRevenue[cid]) {
        clientRevenue[cid] = { name: job.customer.name, total: 0 };
      }
      clientRevenue[cid].total += job.price.toNumber();
    }

    return Object.entries(clientRevenue)
      .map(([id, data]) => ({ id, name: data.name, revenue: Math.round(data.total * 100) / 100 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  async getRecurringSummary(accountId: string | null) {
    const tenant = tenantFilter(accountId);

    const activeRecurring = await prisma.recurringJob.findMany({
      where: { ...tenant, status: 'active' },
      include: { customer: { select: { id: true, name: true } } },
      orderBy: { nextRun: 'asc' },
    });

    // Calculate monthly recurring revenue (normalize all frequencies to monthly)
    let monthlyRecurringRevenue = 0;
    for (const rj of activeRecurring) {
      const price = rj.price.toNumber();
      switch (rj.frequency) {
        case 'daily':
          monthlyRecurringRevenue += price * 30;
          break;
        case 'weekly':
          monthlyRecurringRevenue += price * 4.33;
          break;
        case 'monthly':
          monthlyRecurringRevenue += price;
          break;
      }
    }

    // Next 3 upcoming jobs
    const upcomingJobs = activeRecurring.slice(0, 3).map((rj) => ({
      id: rj.id,
      title: rj.title,
      customerName: rj.customer?.name || 'Unknown',
      frequency: rj.frequency,
      price: rj.price.toNumber(),
      nextRun: rj.nextRun,
    }));

    return {
      monthlyRecurringRevenue: Math.round(monthlyRecurringRevenue * 100) / 100,
      activeCount: activeRecurring.length,
      upcomingJobs,
    };
  }

  async getTaxSummary(accountId: string | null, from: string, to: string) {
    const invoices = await prisma.invoice.findMany({
      where: {
        ...tenantFilter(accountId),
        createdAt: { gte: new Date(from), lte: new Date(to) },
        status: { not: 'cancelled' },
      },
    });

    const summary = {
      totalSubtotal: 0,
      totalTax: 0,
      totalAmount: 0,
      invoiceCount: invoices.length,
    };

    for (const inv of invoices) {
      summary.totalSubtotal += inv.subtotal.toNumber();
      summary.totalTax += inv.taxAmount.toNumber();
      summary.totalAmount += inv.total.toNumber();
    }

    // Round
    for (const key of Object.keys(summary) as (keyof typeof summary)[]) {
      if (typeof summary[key] === 'number' && key !== 'invoiceCount') {
        (summary as any)[key] = Math.round((summary[key] as number) * 100) / 100;
      }
    }

    return summary;
  }
}

export const dashboardService = new DashboardService();
