import prisma from '../../config/database';
import { AppError, tenantFilter, requireAccountId } from '../../utils/response';
import { CreatePayrollEntryInput, UpdatePayrollEntryInput } from './payroll.schema';
import { calculateDeductions, PayrollDeductions } from './tax-engine';

export const PAYROLL_DISCLAIMER =
  'This payroll output is an informational estimate only. It does not constitute an official ' +
  'payroll document, pay stub, or tax slip. Use it for business planning purposes only.';

/** Round to 2 decimal places. */
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Compute gross pay from input components. */
function computeGross(input: {
  hours?: number;
  hourlyRate?: number;
  bonus?: number;
  flatPay?: number;
  taxableBenefits?: number;
  holidayPay?: number;
}): number {
  const hours = input.hours ?? 0;
  const rate = input.hourlyRate ?? 0;
  const bonus = input.bonus ?? 0;
  const flat = input.flatPay ?? 0;
  const benefits = input.taxableBenefits ?? 0;
  const holiday = input.holidayPay ?? 0;
  return r2(hours * rate + bonus + flat + benefits + holiday);
}

/** Flatten DB record into a frontend-friendly shape. */
function shapeEntry(e: any) {
  const b = (e.deductionBreakdown ?? {}) as Record<string, number>;
  return {
    id: e.id,
    userId: e.userId,
    user: e.user
      ? {
          id: e.user.id,
          fullName: `${e.user.firstName ?? ''} ${e.user.lastName ?? ''}`.trim(),
          role: e.user.role,
        }
      : undefined,
    payType: e.payType,
    hours: Number(e.hours),
    hourlyRate: Number(e.hourlyRate),
    bonus: Number(e.bonus),
    flatPay: Number(e.flatPay),
    taxableBenefits: Number(e.taxableBenefits),
    vacationRate: Number(e.vacationRate),
    holidayPay: Number(e.holidayPay),
    grossPay: Number(e.grossPay),
    federalTax: Number(b.federalTax ?? 0),
    provincialTax: Number(b.provincialTax ?? 0),
    cpp: Number(b.cpp ?? 0),
    ei: Number(b.ei ?? 0),
    qpp: Number(b.qpp ?? 0),
    qpip: Number(b.qpip ?? 0),
    totalDeductions: Number(e.totalDeductions),
    netPay: Number(e.netPay),
    workersCompAmount: Number(e.workersCompAmount),
    employerCosts: Number(e.employerCosts),
    isInformationalOnly: e.isInformationalOnly,
    province: e.province,
    payPeriodStart: e.payPeriodStart,
    payPeriodEnd: e.payPeriodEnd,
    createdAt: e.createdAt,
  };
}

export class PayrollService {
  async list(accountId: string | null, filters?: { userId?: string; from?: string; to?: string }) {
    const where: any = { ...tenantFilter(accountId) };
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.from || filters?.to) {
      where.payPeriodStart = {};
      if (filters.from) where.payPeriodStart.gte = new Date(filters.from);
      if (filters.to) where.payPeriodStart.lte = new Date(filters.to);
    }

    const rows = await prisma.payrollEntry.findMany({
      where,
      include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
      orderBy: { payPeriodStart: 'desc' },
    });
    return rows.map(shapeEntry);
  }

  async getById(accountId: string | null, id: string) {
    const entry = await prisma.payrollEntry.findFirst({
      where: { id, ...tenantFilter(accountId) },
      include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
    });
    if (!entry) throw new AppError(404, 'Payroll entry not found', 'NOT_FOUND');
    return { ...shapeEntry(entry), disclaimer: PAYROLL_DISCLAIMER };
  }

  async create(accountId: string | null, input: CreatePayrollEntryInput) {
    const aid = requireAccountId(accountId);

    // FR-PAY-12: validate target user belongs to the same account.
    const user = await prisma.user.findFirst({
      where: { id: input.userId, accountId: aid, isActive: true },
    });
    if (!user) throw new AppError(404, 'User not found in this account', 'USER_NOT_FOUND');

    const grossPay = computeGross(input);
    if (grossPay <= 0) {
      throw new AppError(400, 'Gross pay must be greater than zero', 'INVALID_GROSS');
    }

    // Annualize using the actual pay-period length so deductions are realistic
    // (instead of always assuming a biweekly period).
    const startMs = new Date(input.payPeriodStart).getTime();
    const endMs = new Date(input.payPeriodEnd).getTime();
    const periodDays = Math.max(1, Math.round((endMs - startMs) / 86_400_000) + 1);
    const periodsPerYear = Math.max(1, 365 / periodDays);
    const annualizedGross = r2(grossPay * periodsPerYear);

    const deductions = await calculateDeductions(grossPay, input.province, annualizedGross);
    // Employer-side costs (informational): workers comp + employer-matched CPP/QPP + EI 1.4x
    const employerCosts = r2(
      deductions.workersCompEstimate + deductions.cpp + deductions.qpp + deductions.ei * 1.4,
    );

    const created = await prisma.payrollEntry.create({
      data: {
        accountId: aid,
        userId: input.userId,
        payPeriodStart: new Date(input.payPeriodStart),
        payPeriodEnd: new Date(input.payPeriodEnd),
        hours: input.hours,
        hourlyRate: input.hourlyRate,
        bonus: input.bonus,
        flatPay: input.flatPay,
        taxableBenefits: input.taxableBenefits,
        vacationRate: input.vacationRate,
        holidayPay: input.holidayPay,
        payType: input.payType,
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
        workersCompAmount: deductions.workersCompEstimate,
        employerCosts,
        isInformationalOnly: true,
        province: input.province,
      },
      include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
    });

    return { ...shapeEntry(created), disclaimer: PAYROLL_DISCLAIMER };
  }

  async update(accountId: string | null, id: string, input: UpdatePayrollEntryInput) {
    const aid = requireAccountId(accountId);
    const entry = await prisma.payrollEntry.findFirst({ where: { id, accountId: aid } });
    if (!entry) throw new AppError(404, 'Payroll entry not found', 'NOT_FOUND');

    const merged = {
      hours: input.hours ?? Number(entry.hours),
      hourlyRate: input.hourlyRate ?? Number(entry.hourlyRate),
      bonus: input.bonus ?? Number(entry.bonus),
      flatPay: input.flatPay ?? Number(entry.flatPay),
      taxableBenefits: input.taxableBenefits ?? Number(entry.taxableBenefits),
      holidayPay: input.holidayPay ?? Number(entry.holidayPay),
    };
    const grossPay = computeGross(merged);
    const startMs = new Date(entry.payPeriodStart).getTime();
    const endMs = new Date(entry.payPeriodEnd).getTime();
    const periodDays = Math.max(1, Math.round((endMs - startMs) / 86_400_000) + 1);
    const periodsPerYear = Math.max(1, 365 / periodDays);
    const annualizedGross = r2(grossPay * periodsPerYear);
    const deductions = await calculateDeductions(grossPay, entry.province as 'QC' | 'ON', annualizedGross);
    const employerCosts = r2(
      deductions.workersCompEstimate + deductions.cpp + deductions.qpp + deductions.ei * 1.4,
    );

    const updated = await prisma.payrollEntry.update({
      where: { id },
      data: {
        ...merged,
        vacationRate: input.vacationRate ?? Number(entry.vacationRate),
        payType: input.payType ?? entry.payType,
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
        workersCompAmount: deductions.workersCompEstimate,
        employerCosts,
      },
      include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
    });

    return { ...shapeEntry(updated), disclaimer: PAYROLL_DISCLAIMER };
  }

  async delete(accountId: string | null, id: string) {
    const aid = requireAccountId(accountId);
    const entry = await prisma.payrollEntry.findFirst({ where: { id, accountId: aid } });
    if (!entry) throw new AppError(404, 'Payroll entry not found', 'NOT_FOUND');
    await prisma.payrollEntry.delete({ where: { id } });
  }

  /** Preview deductions without persisting (informational). */
  async preview(
    grossPay: number,
    province: 'QC' | 'ON',
    annualizedGross?: number,
  ): Promise<PayrollDeductions & { disclaimer: string }> {
    const result = await calculateDeductions(grossPay, province, annualizedGross);
    return { ...result, disclaimer: PAYROLL_DISCLAIMER };
  }

  /** Itemized remittance summary for a date range. */
  async remittanceSummary(accountId: string | null, from: string, to: string) {
    const entries = await prisma.payrollEntry.findMany({
      where: {
        ...tenantFilter(accountId),
        payPeriodStart: { gte: new Date(from) },
        payPeriodEnd: { lte: new Date(to) },
      },
    });

    const totals = {
      totalGross: 0,
      totalFederalTax: 0,
      totalProvincialTax: 0,
      totalCpp: 0,
      totalEi: 0,
      totalQpp: 0,
      totalQpip: 0,
      totalDeductions: 0,
      totalNet: 0,
      totalWorkersComp: 0,
      totalEmployerCosts: 0,
      entryCount: entries.length,
    };

    for (const e of entries) {
      const b = (e.deductionBreakdown ?? {}) as Record<string, number>;
      totals.totalGross += Number(e.grossPay);
      totals.totalFederalTax += Number(b.federalTax ?? 0);
      totals.totalProvincialTax += Number(b.provincialTax ?? 0);
      totals.totalCpp += Number(b.cpp ?? 0);
      totals.totalEi += Number(b.ei ?? 0);
      totals.totalQpp += Number(b.qpp ?? 0);
      totals.totalQpip += Number(b.qpip ?? 0);
      totals.totalDeductions += Number(e.totalDeductions);
      totals.totalNet += Number(e.netPay);
      totals.totalWorkersComp += Number(e.workersCompAmount);
      totals.totalEmployerCosts += Number(e.employerCosts);
    }

    for (const k of Object.keys(totals) as (keyof typeof totals)[]) {
      if (k !== 'entryCount') (totals as any)[k] = r2(totals[k] as number);
    }

    return { ...totals, disclaimer: PAYROLL_DISCLAIMER };
  }
}

export const payrollService = new PayrollService();
