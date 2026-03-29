import prisma from '../../config/database';
import { AppError } from '../../utils/response';
import { CreateJobInput, UpdateJobInput } from './jobs.schema';

export class JobsService {
  async list(accountId: string, filters?: { status?: string; customerId?: string; assignedToId?: string; from?: string; to?: string }) {
    const where: any = { accountId };

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

  async getById(accountId: string, id: string) {
    const job = await prisma.job.findFirst({
      where: { id, accountId },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!job) throw new AppError(404, 'Job not found', 'NOT_FOUND');
    return job;
  }

  async create(accountId: string, input: CreateJobInput) {
    // Verify customer belongs to account
    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, accountId, isActive: true },
    });
    if (!customer) throw new AppError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND');

    // Verify assigned user if provided
    if (input.assignedTo) {
      const user = await prisma.user.findFirst({
        where: { id: input.assignedTo, accountId, isActive: true },
      });
      if (!user) throw new AppError(404, 'Assigned user not found', 'USER_NOT_FOUND');
    }

    return prisma.job.create({
      data: {
        ...input,
        scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : undefined,
        completedAt: input.completedAt ? new Date(input.completedAt) : null,
        accountId,
      },
      include: {
        customer: { select: { id: true, name: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async update(accountId: string, id: string, input: UpdateJobInput) {
    const job = await prisma.job.findFirst({ where: { id, accountId } });
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

  async delete(accountId: string, id: string) {
    const job = await prisma.job.findFirst({ where: { id, accountId } });
    if (!job) throw new AppError(404, 'Job not found', 'NOT_FOUND');

    await prisma.job.delete({ where: { id } });
  }

  async markCompleted(accountId: string, id: string) {
    const job = await prisma.job.findFirst({ where: { id, accountId } });
    if (!job) throw new AppError(404, 'Job not found', 'NOT_FOUND');

    return prisma.job.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });
  }
}

export const jobsService = new JobsService();
