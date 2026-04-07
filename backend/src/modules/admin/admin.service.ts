import prisma from '../../config/database';
import { AppError } from '../../utils/response';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config';

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

    const taxCfg = await prisma.taxConfig.upsert({
      where: { province_taxYear: { province: province as any, taxYear } },
      update: { rates },
      create: { province: province as any, taxYear, rates },
    });

    await this.logAdminAction(adminUserId, 'update_tax_config', 'tax_config', taxCfg.id, { province, taxYear });
    return taxCfg;
  }

  /** KPI: MRR from active subscriptions + churn rate */
  async getKpiStats(adminUserId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalAccounts, activeAccounts, subscriptions, recentCancelled, totalUsers] = await Promise.all([
      prisma.account.count(),
      prisma.account.count({ where: { users: { some: { isActive: true } } } }),
      prisma.subscription.findMany({ where: { status: 'active' } }),
      prisma.subscription.count({
        where: { status: 'cancelled', updatedAt: { gte: thirtyDaysAgo } },
      }),
      prisma.user.count(),
    ]);

    // Calculate MRR based on plan pricing ($19 = solo, $29 = pro, $49 = business)
    const planPricing: Record<string, number> = { solo: 19, pro: 29, business: 49 };
    const mrr = subscriptions.reduce((sum, sub) => sum + (planPricing[sub.plan] || 0), 0);

    const startOfPeriodActive = activeAccounts + recentCancelled;
    const churnRate = startOfPeriodActive > 0
      ? Math.round((recentCancelled / startOfPeriodActive) * 10000) / 100
      : 0;

    await this.logAdminAction(adminUserId, 'view_kpi_stats', 'platform');
    return {
      totalAccounts,
      activeAccounts,
      totalUsers,
      mrr,
      churnRate,
      activeSubs: subscriptions.length,
      recentCancelled,
    };
  }

  /** Reset password for any user */
  async resetUserPassword(adminUserId: string, targetUserId: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: targetUserId },
      data: { passwordHash },
    });

    // Revoke all refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId: targetUserId },
      data: { revoked: true },
    });

    await this.logAdminAction(adminUserId, 'reset_password', 'user', targetUserId);
  }

  /** Login As: generate token to impersonate a user */
  async loginAs(adminUserId: string, targetUserId: string) {
    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');

    const payload = { userId: user.id, accountId: user.accountId, role: user.role };
    const accessToken = jwt.sign(payload, config.jwt.accessSecret, { expiresIn: '1h' });

    await this.logAdminAction(adminUserId, 'login_as', 'user', targetUserId);
    return { accessToken, user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, accountId: user.accountId } };
  }

  /** Discount codes CRUD */
  async listDiscountCodes(adminUserId: string) {
    const codes = await prisma.discountCode.findMany({ orderBy: { createdAt: 'desc' } });
    await this.logAdminAction(adminUserId, 'list_discount_codes', 'discount_code');
    return codes;
  }

  async createDiscountCode(adminUserId: string, input: { code: string; discountType: string; discountValue: number; maxUses?: number; expiresAt?: string }) {
    const existing = await prisma.discountCode.findUnique({ where: { code: input.code } });
    if (existing) throw new AppError(409, 'Discount code already exists', 'DUPLICATE_CODE');

    const code = await prisma.discountCode.create({
      data: {
        code: input.code.toUpperCase(),
        discountType: input.discountType,
        discountValue: input.discountValue,
        maxUses: input.maxUses || null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
    });

    await this.logAdminAction(adminUserId, 'create_discount_code', 'discount_code', code.id);
    return code;
  }

  async toggleDiscountCode(adminUserId: string, codeId: string) {
    const code = await prisma.discountCode.findUnique({ where: { id: codeId } });
    if (!code) throw new AppError(404, 'Discount code not found', 'NOT_FOUND');

    const updated = await prisma.discountCode.update({
      where: { id: codeId },
      data: { isActive: !code.isActive },
    });

    await this.logAdminAction(adminUserId, 'toggle_discount_code', 'discount_code', codeId, { newState: updated.isActive });
    return updated;
  }

  async deleteDiscountCode(adminUserId: string, codeId: string) {
    const code = await prisma.discountCode.findUnique({ where: { id: codeId } });
    if (!code) throw new AppError(404, 'Discount code not found', 'NOT_FOUND');

    await prisma.discountCode.delete({ where: { id: codeId } });
    await this.logAdminAction(adminUserId, 'delete_discount_code', 'discount_code', codeId);
  }

  /** Platform settings (pricing etc.) */
  async getPlatformSettings(adminUserId: string) {
    const settings = await prisma.platformSetting.findMany();
    await this.logAdminAction(adminUserId, 'view_platform_settings', 'platform_setting');
    return settings;
  }

  async upsertPlatformSetting(adminUserId: string, key: string, value: any) {
    const setting = await prisma.platformSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    await this.logAdminAction(adminUserId, 'update_platform_setting', 'platform_setting', setting.id, { key });
    return setting;
  }

  /** Get subscription payments for revenue audit */
  async getSubscriptionPayments(adminUserId: string, page = 1, pageSize = 50) {
    const skip = (page - 1) * pageSize;
    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        skip,
        take: pageSize,
        include: {
          account: { select: { id: true, name: true, plan: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.subscription.count(),
    ]);

    // Calculate commission info
    const planPricing: Record<string, number> = { solo: 19, pro: 29, business: 49 };
    const stripeCommissionRate = 0.029; // 2.9% + $0.30
    const stripeFixedFee = 0.30;

    const enriched = subscriptions.map((sub) => {
      const monthlyAmount = planPricing[sub.plan] || 0;
      const stripeFee = Math.round((monthlyAmount * stripeCommissionRate + stripeFixedFee) * 100) / 100;
      const netRevenue = Math.round((monthlyAmount - stripeFee) * 100) / 100;
      return { ...sub, monthlyAmount, stripeFee, netRevenue };
    });

    await this.logAdminAction(adminUserId, 'view_subscription_payments', 'subscription', undefined, { page });
    return { subscriptions: enriched, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}

export const adminService = new AdminService();
