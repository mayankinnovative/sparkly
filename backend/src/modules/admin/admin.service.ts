import prisma from '../../config/database';
import { AppError } from '../../utils/response';

export class AdminService {
  /** FR-ADM-04: Log every admin action (read and write) */
  private async logAdminAction(adminUserId: string, action: string, targetEntity: string, targetId?: string, metadata?: any) {
    await prisma.adminAction.create({
      data: {
        adminUserId,
        action,
        targetEntity,
        targetId: targetId || null,
        metadata: metadata || null,
      },
    });
  }

  async listAccounts(adminUserId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [accounts, total] = await Promise.all([
      prisma.account.findMany({
        skip,
        take: pageSize,
        include: {
          subscription: true,
          _count: { select: { users: true, customers: true, jobs: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.account.count(),
    ]);

    await this.logAdminAction(adminUserId, 'list_accounts', 'account', undefined, { page, pageSize });
    return { accounts, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getAccountDetails(adminUserId: string, accountId: string) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: {
        subscription: true,
        users: { select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true } },
        _count: { select: { customers: true, jobs: true, invoices: true, expenses: true } },
      },
    });
    if (!account) throw new AppError(404, 'Account not found', 'NOT_FOUND');
    await this.logAdminAction(adminUserId, 'view_account_details', 'account', accountId);
    return account;
  }

  async suspendAccount(superAdminId: string, accountId: string, reason: string) {
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new AppError(404, 'Account not found', 'NOT_FOUND');

    await prisma.$transaction([
      prisma.user.updateMany({
        where: { accountId },
        data: { isActive: false },
      }),
      prisma.adminAction.create({
        data: {
          adminUserId: superAdminId,
          action: 'suspend_account',
          targetEntity: 'account',
          targetId: accountId,
          metadata: { reason },
        },
      }),
    ]);
  }

  async reactivateAccount(superAdminId: string, accountId: string) {
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new AppError(404, 'Account not found', 'NOT_FOUND');

    await prisma.$transaction([
      prisma.user.updateMany({
        where: { accountId },
        data: { isActive: true },
      }),
      prisma.adminAction.create({
        data: {
          adminUserId: superAdminId,
          action: 'reactivate_account',
          targetEntity: 'account',
          targetId: accountId,
          metadata: { reason: 'Manual reactivation' },
        },
      }),
    ]);
  }

  async changePlan(superAdminId: string, accountId: string, newPlan: string) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { subscription: true },
    });
    if (!account) throw new AppError(404, 'Account not found', 'NOT_FOUND');

    await prisma.$transaction([
      prisma.account.update({
        where: { id: accountId },
        data: { plan: newPlan as any },
      }),
      ...(account.subscription
        ? [
            prisma.subscription.update({
              where: { id: account.subscription.id },
              data: { plan: newPlan as any },
            }),
          ]
        : []),
      prisma.adminAction.create({
        data: {
          adminUserId: superAdminId,
          action: 'change_plan',
          targetEntity: 'account',
          targetId: accountId,
          metadata: { reason: `Plan changed to ${newPlan}` },
        },
      }),
    ]);
  }

  async getAuditLog(adminUserId: string, page = 1, pageSize = 50) {
    const skip = (page - 1) * pageSize;
    const [actions, total] = await Promise.all([
      prisma.adminAction.findMany({
        skip,
        take: pageSize,
        include: {
          adminUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { timestamp: 'desc' },
      }),
      prisma.adminAction.count(),
    ]);

    await this.logAdminAction(adminUserId, 'view_audit_log', 'admin_action', undefined, { page });
    return { actions, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getSchedulerLogs(adminUserId: string, page = 1, pageSize = 50) {
    const skip = (page - 1) * pageSize;
    const [logs, total] = await Promise.all([
      prisma.schedulerLog.findMany({
        skip,
        take: pageSize,
        orderBy: { executedAt: 'desc' },
      }),
      prisma.schedulerLog.count(),
    ]);

    await this.logAdminAction(adminUserId, 'view_scheduler_logs', 'scheduler_log', undefined, { page });
    return { logs, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getPlatformStats(adminUserId: string) {
    const [accountCount, userCount, jobCount, invoiceCount, revenue] = await Promise.all([
      prisma.account.count(),
      prisma.user.count(),
      prisma.job.count(),
      prisma.invoice.count(),
      prisma.invoice.aggregate({
        _sum: { total: true },
        where: { status: 'paid' },
      }),
    ]);

    await this.logAdminAction(adminUserId, 'view_platform_stats', 'platform', undefined);
    return {
      accountCount,
      userCount,
      jobCount,
      invoiceCount,
      totalPaidRevenue: revenue._sum.total?.toNumber() || 0,
    };
  }

  /** FR-ADM-10: Update tax configuration for a province */
  async updateTaxConfig(adminUserId: string, province: string, taxYear: number, rates: any) {
    if (!['QC', 'ON'].includes(province)) {
      throw new AppError(400, 'Invalid province. Must be QC or ON', 'INVALID_PROVINCE');
    }

    const config = await prisma.taxConfig.upsert({
      where: { province_taxYear: { province: province as any, taxYear } },
      update: { rates },
      create: { province: province as any, taxYear, rates },
    });

    await this.logAdminAction(adminUserId, 'update_tax_config', 'tax_config', config.id, { province, taxYear });
    return config;
  }
}

export const adminService = new AdminService();
