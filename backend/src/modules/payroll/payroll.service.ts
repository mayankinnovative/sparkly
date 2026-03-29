import prisma from '../../config/database';
import { AppError } from '../../utils/response';
import { CreatePayrollEntryInput, UpdatePayrollEntryInput } from './payroll.schema';
import { calculateDeductions, PayrollDeductions } from './tax-engine';

export class PayrollService {
  async list(accountId: string, filters?: { userId?: string; from?: string; to?: string }) {
    const where: any = { accountId };
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.from || filters?.to) {
      where.payPeriodStart = {};
      if (filters.from) where.payPeriodStart.gte = new Date(filters.from);
      if (filters.to) where.payPeriodStart.lte = new Date(filters.to);
    }

    return prisma.payrollEntry.findMany({
      where,
      include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
      orderBy: { payPeriodStart: 'desc' },
    });
  }

  async getById(accountId: string, id: string) {
    const entry = await prisma.payrollEntry.findFirst({
      where: { id, accountId },
      include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
    });
    if (!entry) throw new AppError(404, 'Payroll entry not found', 'NOT_FOUND');
    return entry;
  }

  async create(accountId: string, input: CreatePayrollEntryInput) {
    const user = await prisma.user.findFirst({
      where: { id: input.userId, accountId, isActive: true },
    });
    if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');

    const grossPay = input.hours * input.hourlyRate;
    const deductions = await calculateDeductions(grossPay, input.province);

    return prisma.payrollEntry.create({
      data: {
        accountId,
        userId: input.userId,
        payPeriodStart: new Date(input.payPeriodStart),
        payPeriodEnd: new Date(input.payPeriodEnd),
        hours: input.hours,
        hourlyRate: input.hourlyRate,
        grossPay,
        deductionBreakdown: {
          federalTax: deductions.federalTax,
          provincialTax: deductions.provincialTax,
          cpp: deductions.cpp,
          ei: deductions.ei,
          qpp: deductions.qpp,
          qpip: deductions.qpip,
        },
        totalDeductions: deductions.totalDeductions,
        netPay: deductions.netPay,
        province: input.province,
      },
    });
  }

  async update(accountId: string, id: string, input: UpdatePayrollEntryInput) {
    const entry = await prisma.payrollEntry.findFirst({ where: { id, accountId } });
    if (!entry) throw new AppError(404, 'Payroll entry not found', 'NOT_FOUND');

    const hours = input.hours ?? entry.hours.toNumber();
    const hourlyRate = input.hourlyRate ?? entry.hourlyRate.toNumber();
    const grossPay = hours * hourlyRate;
    const deductions = await calculateDeductions(grossPay, entry.province as 'QC' | 'ON');

    return prisma.payrollEntry.update({
      where: { id },
      data: {
        hours,
        hourlyRate,
        grossPay,
        deductionBreakdown: {
          federalTax: deductions.federalTax,
          provincialTax: deductions.provincialTax,
          cpp: deductions.cpp,
          ei: deductions.ei,
          qpp: deductions.qpp,
          qpip: deductions.qpip,
        },
        totalDeductions: deductions.totalDeductions,
        netPay: deductions.netPay,
      },
    });
  }

  async delete(accountId: string, id: string) {
    const entry = await prisma.payrollEntry.findFirst({ where: { id, accountId } });
    if (!entry) throw new AppError(404, 'Payroll entry not found', 'NOT_FOUND');
    await prisma.payrollEntry.delete({ where: { id } });
  }

  /** Preview deductions without persisting */
  async preview(grossPay: number, province: 'QC' | 'ON', annualizedGross?: number): Promise<PayrollDeductions> {
    return calculateDeductions(grossPay, province, annualizedGross);
  }

  /** Remittance summary for a date range */
  async remittanceSummary(accountId: string, from: string, to: string) {
    const entries = await prisma.payrollEntry.findMany({
      where: {
        accountId,
        payPeriodStart: { gte: new Date(from) },
        payPeriodEnd: { lte: new Date(to) },
      },
    });

    const summary = {
      totalGross: 0,
      totalDeductions: 0,
      totalNet: 0,
      entryCount: entries.length,
    };

    for (const e of entries) {
      summary.totalGross += e.grossPay.toNumber();
      summary.totalDeductions += e.totalDeductions.toNumber();
      summary.totalNet += e.netPay.toNumber();
    }

    // Round all values
    for (const key of Object.keys(summary) as (keyof typeof summary)[]) {
      if (typeof summary[key] === 'number' && key !== 'entryCount') {
        (summary as any)[key] = Math.round((summary[key] as number) * 100) / 100;
      }
    }

    return summary;
  }
}

export const payrollService = new PayrollService();
