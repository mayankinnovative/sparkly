import prisma from '../../config/database';
import { AppError, tenantFilter, requireAccountId } from '../../utils/response';
import { CreateExpenseInput, UpdateExpenseInput } from './expenses.schema';

export class ExpensesService {
  async list(accountId: string | null, filters?: { category?: string; from?: string; to?: string }) {
    const where: any = { ...tenantFilter(accountId) };
    if (filters?.category) where.category = filters.category;
    if (filters?.from || filters?.to) {
      where.date = {};
      if (filters.from) where.date.gte = new Date(filters.from);
      if (filters.to) where.date.lte = new Date(filters.to);
    }

    return prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  async getById(accountId: string | null, id: string) {
    const expense = await prisma.expense.findFirst({ where: { id, ...tenantFilter(accountId) } });
    if (!expense) throw new AppError(404, 'Expense not found', 'NOT_FOUND');
    return expense;
  }

  async create(accountId: string | null, input: CreateExpenseInput) {
    const aid = requireAccountId(accountId);
    return prisma.expense.create({
      data: {
        ...input,
        date: new Date(input.date),
        accountId: aid,
      },
    });
  }

  async update(accountId: string | null, id: string, input: UpdateExpenseInput) {
    const aid = requireAccountId(accountId);
    const expense = await prisma.expense.findFirst({ where: { id, accountId: aid } });
    if (!expense) throw new AppError(404, 'Expense not found', 'NOT_FOUND');

    const data: any = { ...input };
    if (input.date) data.date = new Date(input.date);

    return prisma.expense.update({ where: { id }, data });
  }

  async delete(accountId: string | null, id: string) {
    const aid = requireAccountId(accountId);
    const expense = await prisma.expense.findFirst({ where: { id, accountId: aid } });
    if (!expense) throw new AppError(404, 'Expense not found', 'NOT_FOUND');
    await prisma.expense.delete({ where: { id } });
  }

  async summary(accountId: string | null, from: string, to: string) {
    const expenses = await prisma.expense.findMany({
      where: {
        ...tenantFilter(accountId),
        date: { gte: new Date(from), lte: new Date(to) },
      },
    });

    const byCategory: Record<string, number> = {};
    let total = 0;

    for (const e of expenses) {
      const cat = e.category;
      const amt = e.amount.toNumber();
      byCategory[cat] = (byCategory[cat] || 0) + amt;
      total += amt;
    }

    return { total: Math.round(total * 100) / 100, byCategory, count: expenses.length };
  }
}

export const expensesService = new ExpensesService();
