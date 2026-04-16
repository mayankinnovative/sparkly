import prisma from '../../config/database';
import { AppError, tenantFilter, requireAccountId } from '../../utils/response';
import { CreateJobInput, UpdateJobInput } from './jobs.schema';
import { invoicesService } from '../invoices/invoices.service';

export class JobsService {
  async list(accountId: string | null, filters?: { status?: string; customerId?: string; assignedToId?: string; from?: string; to?: string }) {
    const where: any = { ...tenantFilter(accountId) };

    if (filters?.status) where.status = filters.status;
    if (filters?.customerId) where.customerId = filters.customerId;
    if (filters?.assignedToId) where.assignedTo = filters.assignedToId;
    if (filters?.from || filters?.to) {
      where.scheduledDate = {};
      if (filters.from) where.scheduledDate.gte = new Date(filters.from);
      if (filters.to) where.scheduledDate.lte = new Date(filters.to);
    }

    return prisma.job.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { scheduledDate: 'desc' },
    });
  }

  async getById(accountId: string | null, id: string) {
    const job = await prisma.job.findFirst({
      where: { id, ...tenantFilter(accountId) },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!job) throw new AppError(404, 'Job not found', 'NOT_FOUND');
    return job;
  }

  async create(accountId: string | null, input: CreateJobInput) {
    const aid = requireAccountId(accountId);
    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, accountId: aid, isActive: true },
    });
    if (!customer) throw new AppError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND');

    if (input.assignedTo) {
      const user = await prisma.user.findFirst({
        where: { id: input.assignedTo, accountId: aid, isActive: true },
      });
      if (!user) throw new AppError(404, 'Assigned user not found', 'USER_NOT_FOUND');
    }

    return prisma.job.create({
      data: {
        ...input,
        scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : undefined,
        completedAt: input.completedAt ? new Date(input.completedAt) : null,
        accountId: aid,
      },
      include: {
        customer: { select: { id: true, name: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async update(accountId: string | null, id: string, input: UpdateJobInput) {
    const aid = requireAccountId(accountId);
    const job = await prisma.job.findFirst({ where: { id, accountId: aid } });
    if (!job) throw new AppError(404, 'Job not found', 'NOT_FOUND');

    const data: any = { ...input };
    if (input.scheduledDate) data.scheduledDate = new Date(input.scheduledDate);
    if (input.completedAt) data.completedAt = new Date(input.completedAt);

    return prisma.job.update({
      where: { id },
      data,
      include: {
        customer: { select: { id: true, name: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async delete(accountId: string | null, id: string) {
    const aid = requireAccountId(accountId);
    const job = await prisma.job.findFirst({ where: { id, accountId: aid } });
    if (!job) throw new AppError(404, 'Job not found', 'NOT_FOUND');

    await prisma.job.delete({ where: { id } });
  }

  async markCompleted(accountId: string | null, id: string, timezone?: string) {
    const aid = requireAccountId(accountId);
    const job = await prisma.job.findFirst({ where: { id, accountId: aid } });
    if (!job) throw new AppError(404, 'Job not found', 'NOT_FOUND');

    const updatedJob = await prisma.job.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    // Auto-generate invoice if job has a customer
    if (job.customerId) {
      try {
        const account = await prisma.account.findUnique({ where: { id: aid } });
        const taxType = account?.province === 'ON' ? 'HST' : 'GST_QST';
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);

        await invoicesService.create(
          accountId,
          {
            customerId: job.customerId,
            jobIds: [job.id],
            dueDate: dueDate.toISOString(),
            taxType: taxType as 'GST_QST' | 'HST',
            language: 'en',
          },
          timezone,
        );
      } catch {
        // Invoice generation failure should not block job completion
      }
    }

    return updatedJob;
  }
}

export const jobsService = new JobsService();
